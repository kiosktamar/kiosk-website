# Kiosk Tamar — סיכום ביצוע: ריצה 3 (אימות, הרשאות וניהול משתמשים)

מסמך זה מתעד בצורה מלאה ומפורטת את כל הפעולות, ההחלטות ההנדסיות, הבדיקות והתוצרים שבוצעו במהלך **ריצה 3: אימות, הרשאות וניהול משתמשים (API)**, בהתאם למסמכי הפרויקט:
- **Kiosk Tamar Planout** (אפיון המערכת)
- **מסמך 00: יסודות וחוזים משותפים**
- **מסמך 03: ריצה 3 — אימות, הרשאות וניהול משתמשים**

---

## 1. ניתוח דרישות ותכנון מקדים
1. **קריאה ופענוח מסמכי המקור:** חולץ תוכן קובצי המפרט של ריצה 3 (`KioskTamar_03_ריצה_אימות_והרשאות.docx` וגרסאותיו).
2. **הגדרת גבולות גזרה (Scope):**
   - **בתוך ההיקף:** כל נקודות הקצה של הזדהות, ניהול חשבון אישי, וניהול משתמשים על ידי מנהל; מנגנוני הסיסמאות (`bcryptjs`), ניהול עוגיית ה-JWT (`jose`), חידוש שקט (Silent Renewal), פסילת עוגיות באמצעות `token_version`, מנגנון נעילת חשבון (Lockout), ושומרי הרשאות (`requireUser`, `requireStudent`, `requireAdmin`, `getSessionUser`).
   - **מחוץ להיקף:** נקודות קצה של קיוסק, תפריט, הזמנות וסטטיסטיקה (ריצות 4 ו-5), ממשקי משתמש ומסכים (ריצות 6 ו-7), ו-Rate Limiting ברמת Vercel Firewall (ריצה 9).
3. **עקרונות אבטחה מחייבים שנשמרו בקפדנות:**
   - אין שימוש ב-`Middleware` או ב-`proxy.ts` לצורך בדיקת הרשאות (כל הבדיקות מבוצעות ב-Route Handlers).
   - ה-JWT נשמר אך ורק בעוגיית `HttpOnly` מאובטחת (`kt_session`) ולעולם אינו מוחזר בגוף התשובה (Body) או נשמר ב-LocalStorage.
   - שדה `password_hash` נשאר סגור הרמטית בשירותים ולא דולף ל-DTOs או ל-`app/`.
   - שדות פנימיים כגון `token_version`, `failed_login_count` ו-`locked_until` אינם נחשפים ללקוח.
   - חשבון המנהל מוגן באופן מוחלט: לא ניתן לנעול אותו לעולם עקב כישלונות התחברות, ולא ניתן לאפס את סיסמתו או לחסום אותו מנתיבי ניהול משתמשים.
   - אין תלות בשירותי SMS חיצוניים או ספקי זהות חיצוניים.

---

## 2. שכבת האבטחה וההזדהות (`lib/auth/`)

- **`lib/auth/password.ts`**:
  - `hashPassword(plain)`: הצפנה באמצעות `bcryptjs` ב-Cost 10.
  - `verifyPassword(plain, hash)`: השוואת סיסמה מול ה-Hash.
  - מוגן ב-`import 'server-only'`.

- **`lib/auth/session.ts`**:
  - מודול ניהול Sessions ו-JWT המבוסס על ספריית `jose` (אלגוריתם `HS256`, מפתח `JWT_SECRET` מ-`getEnv()`):
    * `SessionPayload`: `{ userId, role, tokenVersion }`.
    * `SessionClaims`: תוספת של `issuedAt` ו-`expiresAt` (בשניות).
    * `sessionMaxAgeSeconds(role)`: 30 יום לתלמיד (`STUDENT`), 7 ימים למנהל (`ADMIN`).
    * `signSession(payload, now?)`: חתימת Token עם תמיכה בהזרקת `now` עבור בדיקות.
    * `verifySession(token)`: אימות קפדני הכולל בדיקת אלגוריתם, בדיקה ש-`sub` הוא מזהה חיובי ו-`tv` הוא מספר שלם; החזרת `null` בכל מקרה כשל ללא זריקת חריגה.
    * `shouldRenew(claims, now)`: בדיקת צורך בחידוש שקט — רק לתלמיד שנותר לו פחות ממחצית זמן התוקף (15 יום); עבור מנהל מחזיר תמיד `false`.
    * `readSessionToken(req)`: שליפת ה-Token מעוגיית `kt_session`.
    * `setSessionCookie(res, token, role)`: הגדרת עוגייה עם מאפייני אבטחה מלאים (`httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` בסביבת ייצור, ו-`maxAge` לפי תפקיד).
    * `clearSessionCookie(res)`: מחיקת העוגייה על ידי שליחתה עם `maxAge: 0`.

- **`lib/auth/guards.ts`**:
  - שומרי הרשאות מרכזיים לנתיבי השרת ולדפי Server Components:
    * `requireUser(req)`: מבצע את כל שרשרת האימות לפי סעיף 11.3 במסמך 00 (קריאת עוגייה, אימות JWT, שליפת משתמש עדכני מה-DB, וידוא תאימות `token_version`, בדיקת סטטוס `is_active` פעיל).
    * `requireUserWithClaims(req)`: מחזיר גם את ה-`claims` המקוריים עבור חידוש שקט ב-`GET /api/auth/me`.
    * `requireStudent(req)`: קורא ל-`requireUser` ומוודא שהתפקיד הוא `STUDENT` (זורק `403 FORBIDDEN` אחרת).
    * `requireAdmin(req)`: קורא ל-`requireUser` ומוודא שהתפקיד הוא `ADMIN` (זורק `403 FORBIDDEN` אחרת).
    * `getSessionUser()`: פונקציה ייעודית לרכיבי שרת (`Server Components`) המשתמשת ב-`cookies()` מ-`next/headers` ומחזירה `null` בכל כישלון מבלי לזרוק שגיאה.

---

## 3. שכבת השירותים העסקיים (`lib/services/`)

- **`lib/services/AuthService.ts`**:
  - `checkPhone(phone)`: בדיקה מהירה האם מספר הטלפון קיים במערכת (המספר כבר מנורמל).
  - `register({ phone, fullName, password })`: יצירת משתמש תלמיד חדש עם Hash, טיפול במרוץ רישום כפול (`P2002` וזריקת `409 PHONE_ALREADY_REGISTERED`), וזיהוי האם הסיסמה היא סיסמת ברירת המחדל.
  - `login({ phone, password }, now?)`: מימוש מלא של אלגוריתם ההתחברות:
    * שלילת התחברות על משתמש לא קיים עם `401 INVALID_CREDENTIALS` ללא חשיפת קיום החשבון.
    * בדיקת נעילה פעילה (`locked_until > now`) עבור תלמיד וזריקת `423 ACCOUNT_LOCKED` עם שעת הפתיחה.
    * אימות סיסמה מול Hash.
    * בכישלון סיסמה לתלמיד: קידום אטומי של `failed_login_count`. בהגעה ל-5 ניסיונות: נעילה ל-10 דקות ואיפוס המונה; מתחת ל-5: החזרת 401 עם מספר הניסיונות שנותרו.
    * בכישלון סיסמה למנהל: החזרת 401 ללא ספירת ניסיונות וללא נעילה לעולם.
    * בהצלחת סיסמה: בדיקת חסימת חשבון (`is_active = false`) וזריקת `403 ACCOUNT_BLOCKED`.
    * איפוס מוני כישלונות ונעילה ישנה.
  - `changePassword(userId, currentPassword, newPassword)`: אימות הסיסמה הנוכחית (החזרת `400 INVALID_CURRENT_PASSWORD` במקרה שגיאה ולא 401), וידוא אורך 12 תווים לפחות לחשבון מנהל, עדכון ה-Hash והעלאת `token_version` ב-1 לפסילת מכשירים אחרים.
  - `toUserDTO(user)`: המרה נקייה ל-`UserDTO`.

- **`lib/services/UserService.ts`**:
  - `getMe(userId)`: שליפת פרטי המשתמש הנוכחי כ-`UserDTO`.
  - `updateName(userId, fullName)`: עדכון שמו של המשתמש.
  - `findStudentByPhone(phone)`: חיפוש תלמיד לפי טלפון (מחזיר `AdminUserDTO`, זורק `404 USER_NOT_FOUND` אם לא נמצא או אם זהו חשבון מנהל).
  - `resetPassword(targetUserId)`: איפוס סיסמת תלמיד לסיסמת ברירת המחדל (`123456`), קידום `token_version`, איפוס נעילה ומוני כישלונות; חסימת פעולה זו על חשבון מנהל עם `403 ADMIN_ACCOUNT_PROTECTED`.
  - `setActive(targetUserId, isActive)`: חסימה או שחרור חסימה של תלמיד; חסימה מעלה מיד את `token_version` כדי לנתק כל סשן פעיל; מניעת חסימת מנהל עם `403 ADMIN_ACCOUNT_PROTECTED`.

- **`lib/services/index.ts`**:
  - נקודת הרכבה (Composition Root) מרכזית המייצאת אובייקט `services` יחיד עם `auth` ו-`users`.

---

## 4. מימוש 11 נקודות הקצה (`Route Handlers`)

כל נקודות הקצה הוגדרו עם `export const dynamic = 'force-dynamic'`, עטופות ב-`route()`, ושומרות על סדר בדיקות קפדני: **אימות (401) -> הרשאה (403) -> אימות קלט (400/404) -> קריאה לשירות -> החזרת תשובה וטיפול בעוגייה**.

| שיטה | נתיב | קובץ | הרשאה | תיאור ותוצאה |
|---|---|---|---|---|
| `POST` | `/api/auth/check-phone` | `app/api/auth/check-phone/route.ts` | ציבורי | בדיקת קיום מספר טלפון (`200 { exists }`) |
| `POST` | `/api/auth/register` | `app/api/auth/register/route.ts` | ציבורי | הרשמת תלמיד חדש (`201 AuthResponse` + עוגיית `kt_session`) |
| `POST` | `/api/auth/login` | `app/api/auth/login/route.ts` | ציבורי | התחברות למערכת (`200 AuthResponse` + עוגיית `kt_session`) |
| `POST` | `/api/auth/logout` | `app/api/auth/logout/route.ts` | ציבורי | התנתקות ומחיקת העוגייה תמיד (`200 { ok: true }`) |
| `GET` | `/api/auth/me` | `app/api/auth/me/route.ts` | מחובר | פרטי המשתמש הנוכחי (`200 MeResponse`) + חידוש שקט בעת הצורך |
| `PATCH` | `/api/account` | `app/api/account/route.ts` | מחובר | עדכון שם פרטי ומשפחה (`200 MeResponse`) |
| `POST` | `/api/account/password` | `app/api/account/password/route.ts` | מחובר | שינוי סיסמה אישית, עדכון העוגייה במכשיר הנוכחי ופסילת מכשירים קודמים (`200 { ok: true }`) |
| `GET` | `/api/admin/users?phone=` | `app/api/admin/users/route.ts` | מנהל | חיפוש תלמיד לפי טלפון (`200 AdminUserSearchResponse`) |
| `POST` | `/api/admin/users/:id/reset-password` | `app/api/admin/users/[id]/reset-password/route.ts` | מנהל | איפוס סיסמת תלמיד ל-123456 ופסילת הסשנים שלו (`200 { ok: true }`) |
| `PATCH` | `/api/admin/users/:id` | `app/api/admin/users/[id]/route.ts` | מנהל | חסימה או ביטול חסימת תלמיד (`200 AdminUserSearchResponse`) |
| `POST` | `/api/admin/password` | `app/api/admin/password/route.ts` | מנהל | שינוי סיסמת מנהל משותפת (12 תווים ומעלה), עדכון העוגייה ופסילת שאר המכשירים (`200 { ok: true }`) |

---

## 5. תשתית עזרי בדיקה ובדיקות אינטגרציה

- **`tests/helpers/auth.ts`**:
  - `createStudent(opts?)`: יצירת תלמיד ישירות דרך נתיב הרישום והחזרת פרטיו יחד עם עוגיית הסשן.
  - `loginAs(phone, password)`: התחברות דרך נתיב ה-Login והחזרת ערך עוגיית `kt_session`.
  - `adminCookie()`: התחברות מנהל אוטומטית לפי `ADMIN_PHONE` ו-`ADMIN_PASSWORD` מסביבת הבדיקות.

- **`tests/integration/auth/auth.test.ts`**:
  - נכתבו ונבדקו **30 מקרי בדיקה מפורטים ומקיפים** (המכסים את כל 26 התרחישים המוגדרים בסעיף 5 של מסמך 03):
    1. `check-phone`: בדיקת תקינות לפני רישום ואחרי רישום בפורמטים שונים.
    2. `check-phone`: דחיית מספר טלפון קווי (`03-1234567`) בקוד `400 INVALID_PHONE`.
    3. `register`: יצירת תלמיד חדש, קבלת קוד 201, וידוא מאפייני עוגייה (`HttpOnly`, `SameSite=Lax`).
    4. `register`: דחיית רישום כפול באותו מספר טלפון (`409 PHONE_ALREADY_REGISTERED`).
    5. `register`: דחיית שדות קצרים מדי ושדות עודפים כגון `role: 'ADMIN'`.
    6. `register`: דחיית אי-התאמה בין סיסמה לאימות סיסמה (`400 PASSWORD_MISMATCH`).
    7. `login`: התחברות עם סיסמה נכונה, הפקת עוגייה ודגל `isDefaultPassword`.
    8. `login`: מעקב מדויק אחרי 4 ניסיונות כושלים וספירת `remainingAttempts` לאחור.
    9. `login`: נעילת חשבון בניסיון החמישי (`423 ACCOUNT_LOCKED`), מניעת התחברות גם בסיסמה נכונה עד תום הנעילה, ופתיחה לאחר חלוף הזמן.
    10. `login`: וידוא שחשבון המנהל אינו ננעל לעולם (7 ניסיונות כושלים ואז הצלחה).
    11. `login`: דחיית משתמש חסום בסיסמה נכונה (`403 ACCOUNT_BLOCKED`).
    12. עוגיות ו-`token_version`: פנייה ל-`/api/auth/me` ללא עוגייה (`401 UNAUTHENTICATED`).
    13. עוגיות ו-`token_version`: דחיית עוגייה מזויפת או פגת תוקף (`401`).
    14. עוגיות ו-`token_version`: איפוס סיסמת תלמיד על ידי מנהל פוסל מיד את העוגייה הישנה (`401`).
    15. עוגיות ו-`token_version`: חסימת תלמיד פוסלת מיד את העוגייה; ביטול חסימה מאפשר התחברות מחדש.
    16. עוגיות ו-`token_version`: חידוש שקט לעוגיית תלמיד בת 20 יום, ואי-חידוש לעוגייה חדשה בת יום.
    17. עוגיות ו-`token_version`: וידוא שלעוגיית מנהל אין חידוש שקט.
    18. `logout`: החזרת עוגייה עם `Max-Age=0` תמיד (גם ללא עוגייה בבקשה).
    19. הרשאות: תלמיד הפונה לנתיב ניהול מקבל `403 FORBIDDEN`.
    20. הרשאות: אורח הפונה לנתיב ניהול מקבל `401 UNAUTHENTICATED`.
    21. הרשאות: פנייה ללא כותרת `Origin` בבקשות משנות מקבלת `403 BAD_ORIGIN`.
    22. הרשאות: פנייה עם `Origin` זר מקבלת `403 BAD_ORIGIN`.
    23. ניהול חשבון: עדכון שם ב-`PATCH /api/account` ודחיית שם באורך חורג (41 תווים).
    24. שינוי סיסמה: סיסמה נוכחית שגויה מחזירה `400 INVALID_CURRENT_PASSWORD` (ולא 401 שגורם לניתוק הלקוח).
    25. שינוי סיסמה: אי-התאמת סיסמאות מחזירה `400 PASSWORD_MISMATCH`.
    26. שינוי סיסמה: הצלחה מנפיקה עוגייה חדשה למכשיר המבצע ופוסלת מכשירים קודמים.
    27. ניהול משתמשים: איתור תלמיד בפורמט טלפון חופשי, והחזרת `404` על חיפוש טלפון המנהל.
    28. ניהול משתמשים: איפוס סיסמה מאפס את מונה הכשלונות ואת הנעילה ומאפשר כניסה עם `123456`.
    29. הגנת מנהל: ניסיון לאפס או לחסום את חשבון המנהל מחזיר `403 ADMIN_ACCOUNT_PROTECTED`.
    30. סיסמת מנהל: דחיית סיסמה חדשה בת 11 תווים, אישור סיסמה בת 12 תווים ופסילת סשנים קודמים.

---

## 6. תוצאות ההרצה והאימות בפועל מול ענן Neon

כל שלבי האימות עברו בהצלחה מלאה ומושלמת (Quality Gates):

1. **`npm run typecheck` (`next typegen && tsc --noEmit`)**:
   - עבר בהצלחה מלאה עם **0 שגיאות טיפוסים**. כל החוזים וה-Schemas מאומתים במלואם.
2. **`npm run lint` (`eslint . --max-warnings=0`)**:
   - עבר עם **0 שגיאות ו-0 אזהרות**.
3. **בדיקות יחידה (`npm test` / `vitest run --project unit`)**:
   - **81 מתוך 81 בדיקות עברו בהצלחה (100%)** ב-12 קובצי בדיקות יחידה.
4. **בדיקות אינטגרציה מול ענן Neon (`npm run test:integration`)**:
   - **45 מתוך 45 בדיקות עברו בהצלחה (100%)**:
     * 15 בדיקות תשתית ומסד נתונים מריצה 1 (`tests/integration/foundation.test.ts`).
     * 30 בדיקות אימות, הרשאות וניהול משתמשים מריצה 3 (`tests/integration/auth/auth.test.ts`).
5. **בדיקת נזילות אבטחה (Self-Inspection):**
   - `git grep "password_hash" -- app/` -> 0 תוצאות (ה-Hash נשמר אך ורק בשכבת השירותים).
   - `git grep "console.log" -- lib/ app/` -> 0 תוצאות (נשמר איסור שימוש ב-console.log).
6. **הידור ייצור (`npm run build` / `prisma generate && next build`)**:
   - הפרויקט התקמפל בהצלחה מלאה (Compiled successfully in 4.0s).
   - כל 11 נתיבי ה-API החדשים מופו ונבנו כ-Dynamic Server Routes (`ƒ`).

