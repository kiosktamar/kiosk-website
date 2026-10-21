# Kiosk Tamar (קיוסק תמר)

מערכת Web להזמנת מזון מראש בקיוסק הישיבה.
נבנית ב-9 ריצות מוגדרות מראש בהתאם לחוזים ומסמכי האפיון.

---

## ריצה 1: תשתית ובסיס נתונים (Run 01 — Infrastructure & Database)

בריצה זו הוקמה התשתית הטכנולוגית המלאה של המערכת:

- פרויקט **Next.js 16 (App Router)** עם **TypeScript (strict)**, **ESLint**, **Prettier**.
- מודל נתונים מלא ב-**Prisma 7** (10 טבלאות מנורמלות, 6 טיפוסי Enum, ו-16 אילוצי `CHECK` ב-SQL).
- חיבור ישיר ומאוגד (Pooled / Direct) לבסיס נתונים **Neon PostgreSQL** באמצעות `@prisma/adapter-neon`.
- סקריפט Seed אידמפוטנטי (`prisma/seed.ts`, `prisma/seed-data.ts`).
- נקודת קצה לבדיקת זמינות `GET /api/health`.
- תשתית בדיקות מלאה ב-**Vitest** (פרויקט unit ופרויקט integration עם `resetDatabase()` והגנת ענף test).
- צינור בדיקות איכות **GitHub Actions CI**.

---

## דרישות מערכת (Prerequisites)

- **Node.js**: גרסה 22 LTS ומעלה (`"engines": { "node": ">=22" }`).
- **npm**: מותקן כחלק מ-Node.js.

---

## התקנה ראשונית (Setup)

1. שכפול המאגר והתקנת תלויות נעולות:

   ```bash
   npm ci
   ```

2. הגדרת משתני סביבה:
   העתק את קובץ הדוגמה לקובצי סביבה מקומיים:
   ```bash
   cp .env.example .env
   cp .env.example .env.test
   ```
   - מלא ב-`.env` את מחרוזות החיבור לענף `dev` ב-Neon ואת פרטי המנהל.
   - מלא ב-`.env.test` את מחרוזות החיבור לענף `test` ב-Neon ואת `NEON_TEST_BRANCH_HINT` (מזהה השרת הייחודי של ענף ה-test).

---

## ענפי Neon ושימושם

| ענף ב-Neon | סביבה                 | מטרת שימוש                                                         |
| :--------- | :-------------------- | :----------------------------------------------------------------- |
| `main`     | Production            | משמש את Vercel בסביבת הייצור בלבד. סודי ולא עובר למפתחים.          |
| `dev`      | Development & Preview | משמש לפיתוח מקומי ולסביבות Preview ב-Vercel.                       |
| `test`     | Integration Testing   | מיועד לבדיקות אינטגרציה מקומיות. מתאפס ונטען מחדש בכל ריצת בדיקות. |

---

## סקריפטים זמינים (Scripts)

| פקודה                      | תיאור                                                |
| :------------------------- | :--------------------------------------------------- |
| `npm run dev`              | הפעלת שרת פיתוח מקומי בכתובת `http://localhost:3000` |
| `npm run build`            | יצירת לקוח Prisma ובניית הפרויקט לייצור              |
| `npm run start`            | הפעלת שרת הייצור מקומית                              |
| `npm run lint`             | בדיקת איכות קוד עם ESLint (ללא אזהרות)               |
| `npm run typecheck`        | אימות טיפוסי TypeScript עם `tsc --noEmit`            |
| `npm run format`           | עיצוב כל הקבצים עם Prettier                          |
| `npm test`                 | הרצת בדיקות יחידה (Unit tests) ללא בסיס נתונים       |
| `npm run test:integration` | הרצת בדיקות אינטגרציה מול ענף ה-test ב-Neon          |
| `npm run db:migrate`       | יצירת והחלת מיגרציות חדשות על ענף dev                |
| `npm run db:deploy`        | החלת מיגרציות קיימות (למשל על סביבת production)      |
| `npm run db:seed`          | הרצת סקריפט הזנת הנתונים ההתחלתי                     |
| `npm run db:test:prepare`  | החלת כל המיגרציות על ענף ה-test ב-Neon               |

---

## הרצת בדיקות (Testing)

- **בדיקות יחידה:**
  ```bash
  npm test
  ```
- **הכנת ענף ה-test והרצת בדיקות אינטגרציה:**
  ```bash
  npm run db:test:prepare
  npm run test:integration
  ```

---

## פריסה (Deployment to Vercel)

1. הגדרת פרויקט חדש ב-Vercel המחובר למאגר ה-GitHub.
2. הגדרת משתני הסביבה ב-Vercel עבור Production (ענף `main` ב-Neon) ועבור Preview (ענף `dev` ב-Neon).
3. אזור הריצה מוגדר אוטומטית ל-`fra1` (Frankfurt) דרך `vercel.json`.
4. לאחר הפריסה הראשונית, יש להריץ `npm run db:deploy` ו-`npm run db:seed` כנגד מחרוזות הייצור.
