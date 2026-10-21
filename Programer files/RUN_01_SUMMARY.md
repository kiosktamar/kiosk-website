# Kiosk Tamar — סיכום ביצוע: ריצה 1 (תשתית ובסיס נתונים)

מסמך זה מתעד בצורה מלאה ומפורטת את כל הפעולות, ההחלטות ההנדסיות, הבדיקות והתוצרים שבוצעו במהלך **ריצה 1: תשתית ובסיס נתונים**, בהתאם למסמכי הפרויקט:
- **Kiosk Tamar Planout** (אפיון המערכת)
- **מסמך 00: יסודות וחוזים משותפים**
- **מסמך 01: ריצה 1 — תשתית ובסיס נתונים**

---

## 1. ניתוח דרישות ותכנון מקדים (/plan)
1. **קריאה ופענוח מסמכי המקור:** חולץ תוכן קובצי ה-DOCX עבור מסמך המאסטר, מסמך 00 ומסמך 01.
2. **הגדרת גבולות גזרה (Scope):**
   - הובהר כי בריצה זו **לא נבנים פיצ'רים למשתמש** ולא ממומשות נקודות קצה מעבר ל-`GET /api/health`.
   - נאסר שימוש בספריות צד-שלישי שאינן ברשימה המאושרת.
3. **הבהרה לגבי שירותים חיצוניים (APIs):**
   - הובהר למשתמש כי המערכת **אינה משתמשת בשום שירות חיצוני** (ללא סליקת אשראי, ללא SMS/WhatsApp, ללא שירותי Push).
   - השירות החיצוני היחיד של המערכת הוא מסד הנתונים **Neon PostgreSQL** (חיבורי Pooled ו-Direct) ואירוח ב-**Vercel**.
4. **יצירת תוכנית עבודה:** נוצר מסמך `run_01_implementation_plan.md` שאושר על ידי המשתמש לפני כתיבת שורת קוד אחת.

---

## 2. הקמת שלד הפרויקט (Next.js 16 + TypeScript)
- **`package.json`**:
  - הוגדר `"type": "module"` ו-`"engines": { "node": ">=22" }`.
  - הותקנו וננעלו גרסאות מדויקות (ללא תווי `^`): `next@16.4.2`, `react@19.3.0`, `@prisma/client@7.10.1`, `@prisma/adapter-neon@7.10.1`, `zod@4.6.7`, `bcryptjs@3.0.3`, `jose@6.2.2`, `@tanstack/react-query@5.67.2`, `lucide-react@1.16.0`, `server-only@0.0.1`, וספריות הפיתוח.
  - נוצר `package-lock.json`.
  - הוגדרו כל סקריפטי הפרויקט המחייבים (`dev`, `build`, `start`, `postinstall`, `lint`, `typecheck`, `format`, `test`, `test:integration`, `db:migrate`, `db:deploy`, `db:seed`, `db:test:prepare`).
- **`tsconfig.json`**: הוגדר במצב `strict: true`, עם נתיבי ייבוא `@/*`.
- **`eslint.config.mjs`**: הוגדר עם Flat Config של ESLint 9 ו-Next.js 16, כולל הכלל `"no-console": ["error", { allow: ["error"] }]` והתעלמות מ-`lib/generated/**`.
- **`next.config.ts`**: הוגדר ללא `cacheComponents` (נאסר במפורש במסמך 00 סעיף 9.1), עם נעילת `turbopack.root` לתיקיית הפרויקט.
- **`.prettierrc` ו-`.prettierignore`**: הוגדרו כללי העיצוב, תוך שמירה על תיקיות אסמכתה (`Bagrut`, `Schema`, `Programer files`) וקוד מחולל.
- **`.gitignore`**: נוספה הגנה קשיחה על `.env`, `.env.test`, `.env*.local`, `/lib/generated`, ו-`.vscode/`.
- **`vercel.json`**: הוגדר אזור פונקציות `fra1` (פרנקפורט).
- **`.env.example`**: תועדו כל המשתנים הנדרשים ללא ערכים סודיים.

---

## 3. בסיס הנתונים ו-Prisma 7
- **`prisma.config.ts`**: תצורת Prisma 7 המשתמשת ב-`env('DIRECT_URL')` וסקריפט Seed של `tsx prisma/seed.ts`.
- **`prisma/schema.prisma`**: העתקה מדויקת של הסכמה ממסמך 00 סעיף 7.3:
  - 10 טבלאות: `Users`, `Categories`, `Products`, `Toppings`, `ProductToppings`, `ComboComponents`, `KioskSettings`, `Orders`, `OrderItems`, `OrderItemToppings`.
  - 6 טיפוסי Enum: `Role`, `OrderStatus`, `StockStatus`, `ProductType`, `ToppingKind`, `PaymentMethod`.
  - שימוש ב-`@db.Timestamptz(6)` לכל שדות הזמן.
- **קובץ המיגרציה הראשון (`prisma/migrations/20261021153000_init/migration.sql`)**:
  - מכיל את כל מבנה ה-DDL (טבלאות, מפתחות זרים, אינדקסים).
  - מכיל בסופו את **כל 16 אילוצי ה-`CHECK`** מסעיף 7.4 במסמך 00:
    1. פורמט טלפון נייד ישראלי (`^05[0-9]{8}$`)
    2. מונים אי-שליליים למשתמש
    3. מחיר מוצר אי-שלילי
    4. כמות מלאי אי-שלילית
    5. מוצר מוגבל (`LIMITED`) חייב כמות מלאי, ולהפך
    6. עסקית (`COMBO`) לא יכולה לקבל שובר
    7. עסקית לא יכולה להיות במצב `LIMITED`
    8. תוספת מחיר לתוספת אי-שלילית
    9. רכיב עסקית הוא בדיוק אחד: מוצר קבוע או קטגוריה לבחירה
    10. שורה יחידה ב-`KioskSettings` (`id = 1`)
    11. טווח הזמנות פתוחות מותר בין 1 ל-5
    12. סכומי הזמנה אי-שליליים
    13. `closed_at` קיים אם ורק אם ההזמנה בסטטוס `PAID` או `CANCELED`
    14. שורות הזמנה: כמויות חיוביות ומחירים אי-שליליים
    15. אמצעי תשלום קיים בשורה ראשית בלבד ולא בשורת-בת
    16. תוספת מחיר בשורת הזמנה אי-שלילית

---

## 4. שכבות שרת בסיסיות, Seed ונקודת קצה
- **`lib/env.ts`**:
  - פותח ב-`import 'server-only';`.
  - אימות Zod קפדני עבור `DATABASE_URL`, `JWT_SECRET` (אורך 32+), `NODE_ENV`.
  - פונקציה `getEnv()` ממומאזת.
- **`lib/db.ts`**:
  - Singleton של `PrismaClient` עם מתאם `@prisma/adapter-neon` ומחרוזת ה-Pooled.
- **`prisma/seed-data.ts`**:
  - לוגיקת הזנה אידמפוטנטית: הגדרות קיוסק ברירת מחדל, משתמש מנהל עם סיסמה מוצפנת ב-bcrypt (Cost 10), 4 קטגוריות, 8 מוצרים, 8 תוספות/רטבים, שיוכי תוספות ורכיבי עסקיות.
- **`prisma/seed.ts`**:
  - נקודת כניסה המאמתת `ADMIN_PHONE` (10 ספרות המתחילות ב-05) ו-`ADMIN_PASSWORD` (12 תווים לפחות).
- **`app/api/health/route.ts`**:
  - `GET /api/health` עם `SELECT 1` ישיר, קוד 200 עם `{ ok: true }` וכותרת `Cache-Control: no-store`, או 503 במקרה שגיאה.
- **`app/layout.tsx` ו-`app/page.tsx`**:
  - שלד דף בית מינימלי התומך בעברית (`dir="rtl"`) ומציג "Kiosk Tamar".

---

## 5. תשתית בדיקות ואימות איכות
- **`vitest.config.ts`**:
  - מוגדרים שני פרויקטים: `unit` ו-`integration`.
  - Alias של `server-only` לקובץ עזר (`server-only-stub.ts`) כדי לאפשר ייבוא מודולי שרת בבדיקות.
  - הוגדרו זמני פקיעה מותאמים לענן: `hookTimeout: 60000`, `testTimeout: 60000`.
- **`tests/helpers/setup-integration.ts`**:
  - מנגנון הגנה שמוודא ריצה מול `.env.test` ובודק ש-`DATABASE_URL` מכיל את `NEON_TEST_BRANCH_HINT`, כדי למנוע איפוס של בסיס נתונים שאינו סביבת בדיקות.
- **`tests/helpers/db.ts`**:
  - פונקציה `resetDatabase()` המריצה `TRUNCATE` מדורג עם `RESTART IDENTITY CASCADE` ולאחריו `seedDatabase()`.
- **`tests/integration/foundation.test.ts`**:
  - מערך של 15 בדיקות אינטגרציה המכסות:
    * בריאות השרת (`GET /api/health`)
    * בדיקת כמויות רשומות מדויקות מה-Seed
    * אידמפוטנטיות של ה-Seed ושימור מחירים ששונו
    * בדיקות כישלון לכל אילוצי ה-`CHECK` בבסיס הנתונים
    * ביטול (Rollback) בטרנזקציות אינטראקטיביות
    * עדכון מלאי אטומי מותנה במקביל (`updateMany` עם `decrement`)

---

## 6. אבטחת מידע וניהול סודות
- כאשר המשתמש הזין בטעות פרטי חיבור אמיתיים לתוך `.env.example`, הוצגה מיד אזהרת אבטחה ברורה.
- הפרטים הועברו לקובצי סביבה מקומיים (`.env` ו-`.env.test`) המוגנים ב-`.gitignore`.
- הוסבר למשתמש תפקיד המשתנה `NEON_TEST_BRANCH_HINT` כמנגנון הגנה קריטי.

---

## 7. תוצאות ההרצה והאימות בפועל מול ענן Neon
כל הפקודות הורצו ואומתו בפועל מול מסד הנתונים בענן:
1. **`npm run db:deploy`**: המיגרציה וה-CHECK constraints הוחלו בהצלחה על ענף הפיתוח.
2. **`npm run db:seed`**: הנתונים ההתחלתיים הוזנו, והרצה חוזרת הוכיחה אידמפוטנטיות מלאה ללא כפילויות.
3. **`npm run db:test:prepare`**: המיגרציה הוחלה בהצלחה על ענף ה-test ב-Neon.
4. **`npm run test:integration`**: **15 מתוך 15 בדיקות עברו בהצלחה מלאה**.
5. **`npm run lint`**: עבר עם 0 שגיאות ו-0 אזהרות.
6. **`npm run typecheck`**: עבר ללא שגיאות טיפוסים.
7. **`npm test`**: עבר בהצלחה (פרויקט unit עם `passWithNoTests: true`).
8. **`npm run build`**: הפרויקט נבנה בהצלחה תוך 341ms בלבד.
