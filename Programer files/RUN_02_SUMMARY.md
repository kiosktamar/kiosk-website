# Kiosk Tamar — סיכום ביצוע: ריצה 2 (ליבה משותפת)

מסמך זה מתעד בצורה מלאה ומפורטת את כל הפעולות, ההחלטות ההנדסיות, הבדיקות והתוצרים שבוצעו במהלך **ריצה 2: ליבה משותפת (חוזים, מחלקות תחום, שגיאות, ולידציה ועטיפת ה-API)**, בהתאם למסמכי הפרויקט:
- **Kiosk Tamar Planout** (אפיון המערכת)
- **מסמך 00: יסודות וחוזים משותפים**
- **מסמך 02: ריצה 2 — ליבה משותפת**

---

## 1. ניתוח דרישות ותכנון מקדים (/plan)
1. **הבהרה לגבי APIs ושירותים חיצוניים:** הובהר כי המערכת פועלת בצורה עצמאית לחלוטין: ללא סליקת אשראי חיצונית (תשלום במזומן/שובר בדלפק), ללא שירותי SMS/WhatsApp/OTP (אימות ב-JWT בעוגיית `kt_session`), ללא שירותי Push חיצוניים (שימוש ב-Polling מותאם למכסות Vercel), וללא תלות חיצונית מלבד מסד הנתונים Neon PostgreSQL ואירוח ב-Vercel.
2. **הגדרת גבולות גזרה (Scope):** בריצה זו לא נוצרה אף נקודת קצה חדשה (למעט הסבת `GET /api/health` לעטיפת `route()`), לא הוקמו שירותי מידע (`*Service`) ולא נוספו ספריות חיצוניות.
3. **איזומורפיות מלאה:** נשמרה הפרדה הרמטית כך שכל הקוד ב-`lib/contracts/` וב-`lib/domain/` רץ הן בשרת והן בדפדפן, ללא ייבוא של `server-only`, `lib/db`, `next/*` או מודולי Node.js.
4. **אישור תוכנית עבודה:** נוצר מסמך `run_02_implementation_plan.md` שאושר על ידי המשתמש לפני הביצוע.

---

## 2. קובצי חוזה משותפים (`lib/contracts/`)
- **`lib/contracts/api.ts`**:
  - העתקה מדויקת ומחייבת של כל טיפוסי ה-API ממסמך 00 סעיף 9.3:
    * Enums: `Role`, `OrderStatus`, `StockStatus`, `ProductType`, `ToppingKind`, `PaymentMethod`.
    * DTOs להזדהות: `UserDTO`, `CheckPhoneRequest`, `CheckPhoneResponse`, `RegisterRequest`, `LoginRequest`, `AuthResponse`, `MeResponse`, `UpdateAccountRequest`, `ChangePasswordRequest`, `ChangeAdminPasswordRequest`.
    * DTOs לניהול משתמשים: `AdminUserDTO`, `AdminUserSearchResponse`, `UpdateUserRequest`.
    * DTOs לקיוסק: `KioskStatusDTO`, `UpdateKioskRequest`.
    * DTOs לתפריט: `MenuToppingDTO`, `MenuComboOptionDTO`, `MenuComboComponentDTO`, `MenuProductDTO`, `MenuCategoryDTO`, `MenuResponse`.
    * DTOs להזמנות: `OrderComponentSelection`, `OrderLineRequest`, `CreateOrderRequest`, `OrderItemToppingDTO`, `OrderItemDTO`, `OrderDTO`, `AdminOrderDTO`, `CreateOrderResponse`, `MyOrdersResponse`, `AdminOrdersResponse`, `UpdateOrderStatusRequest`, `UpdateOrderStatusResponse`.
    * DTOs לניהול פריטים: `AdminToppingDTO`, `AdminComboComponentDTO`, `AdminProductDTO`, `AdminCategoryDTO`, `AdminProductsResponse`, `AdminProductResponse`, `AdminToppingResponse`, `CreateProductRequest`, `UpdateProductRequest`, `SetProductToppingsRequest`, `SetComboComponentsRequest`, `CreateToppingRequest`, `UpdateToppingRequest`.
    * DTOs לסטטיסטיקה: `StatsDayDTO`, `StatsResponse`.
- **`lib/contracts/limits.ts`**:
  - קבועי המערכת ממסמך 00 סעיף 9.4: `PHONE_REGEX`, `NAME_MIN`, `NAME_MAX`, `PASSWORD_MIN`, `PASSWORD_MAX`, `ADMIN_PASSWORD_MIN`, `DEFAULT_RESET_PASSWORD`, `LOCKOUT_ATTEMPTS`, `LOCKOUT_MINUTES`, `STUDENT_SESSION_DAYS`, `ADMIN_SESSION_DAYS`, `SESSION_COOKIE`, `LINE_QTY_MIN`, `LINE_QTY_MAX`, `ORDER_UNITS_MAX`, `LOW_STOCK_THRESHOLD`, `MY_ORDERS_CLOSED_LIMIT`, `ORDER_CODE_LENGTH`, `ORDER_CODE_ALPHABET`, `ORDER_CODE_MAX_ATTEMPTS`, `CLOSE_TIME_MIN_MINUTES`, `CLOSE_TIME_MAX_HOURS`, `PRODUCT_NAME_MAX`, `DESCRIPTION_MAX`, `TOPPING_NAME_MAX`, `SLOT_LABEL_MAX`, `PRICE_MAX_AGOROT`, `PRICE_STEP_AGOROT`, `STATS_TOP_DAYS`, `STATS_TOP_LIMIT`, `STATS_DAILY_DAYS`, זמני Polling, ו-`TIMEZONE = 'Asia/Jerusalem'`.
- **`lib/contracts/errors.ts`**:
  - `SERVER_ERRORS`: קטלוג כל 29 השגיאות מטבלה 10 במסמך 00, כולל קודי HTTP והודעות מדויקות בעברית.
  - `CLIENT_ERRORS`: שגיאת `NETWORK_ERROR`.
  - טיפוסים וממשק `ApiErrorBody`.
- **`lib/contracts/labels.ts`**:
  - תוויות `ORDER_STATUS_LABEL` (לתלמיד ולמנהל), `KIOSK_LABEL`, `STOCK_LABEL`, `PAYMENT_LABEL`, `TOPPING_KIND_LABEL`.
- **`lib/contracts/index.ts`**: ייצוא מחדש מלא.

---

## 3. מחלקות תחום טהורות (`lib/domain/`)
- **`PhoneNumber`**:
  - נרמול מספרי טלפון ישראליים (הסרת רווחים, מקפים, נקודות, סוגריים, והמרת `+972` או `972` ל-`0`).
  - אימות מול `PHONE_REGEX` (`05XXXXXXXX`).
  - ספירת ספרות מנורמלות (`digitCount`) לשליטה בממשק משתמש.
  - עיצוב `format()` בפורמט `05X-XXX-XXXX`.
- **`OrderCode`**:
  - יצירת קוד הזמנה אקראי בן 4 תווים מתוך `ORDER_CODE_ALPHABET` (31 תווים ללא 0/1/o/l/i).
  - שימוש ב-`globalThis.crypto.getRandomValues` עם Rejection Sampling לנטרול מוחלט של Modulo Bias.
  - תמיכה בהזרקת פונקציית `random` עבור בדיקות יחידה דטרמיניסטיות.
  - פונקציה `isValid` לאימות תקינות קוד.
- **`Money`**:
  - ניהול סכומים באגורות שלמות ללא שגיאות נקודה צפה (זריקת `RangeError` על ערכים שליליים או לא שלמים).
  - עיצוב סכומים: `₪12.50` או `₪12` כשאין אגורות.
  - המרת קלט משתמש בשקלים לאגורות (`parseShekelInput`).
  - פונקציית `paymentSummary` להפקת סיכומי גבייה מדויקים לכל 5 המקרים המוגדרים באפיון.
- **`OrderStatusMachine`**:
  - מכונת מצבים מלאה למחזור החיים של הזמנה (`PENDING`, `READY`, `PAID`, `CANCELED`).
  - פונקציות `canTransition`, `isOpen`, `isFinal`.
  - פונקציית `requiredCurrent` לתמיכה בעדכונים מותנים אטומיים בבסיס הנתונים.
- **`OrderPricing`**:
  - מימוש יחיד של נוסחת התמחור המשותפת לשרת ולעגלה (מסמך 00 סעיף 8.2).
  - חישוב שורות מזומן ושורות שובר (שובר מכסה מחיר בסיס, תוספות משולמות תמיד במזומן).
  - חישוב סיכום הזמנה כולל.
- **`IsraelTime`**:
  - ניהול זמנים ושעון ישראל המבוסס במלואו על `Intl.DateTimeFormat` עם אזור זמן `Asia/Jerusalem`.
  - ללא תלות באזור הזמן המקומי של השרת וללא קיבוע ידני של היסט UTC.
  - פונקציות `formatTime`, `formatDate`, `formatFullDate`, `dateKey`.
  - פונקציית `wallTimeToUtc` למציאת מועד הסגירה הבא בשעון ישראל (כולל בדיקת התאמה והתמודדות עם מעבר שעון חורף/קיץ).
  - אימות שעת סגירה `isValidClosingTime` (בין דקה ל-10 שעות מעכשיו).
  - חישוב הפרש דקות `minutesBetween` (אי-שלילי ומעוגל מטה).
- **`lib/domain/index.ts`**: ייצוא מחדש מלא.

---

## 4. מנגנון שגיאות מרכזי (`lib/errors/`)
- **`AppError`**: מחלקת שגיאה עסקית היורשת מ-`Error`, גוזרת סטטוס HTTP אוטומטית מקטלוג `SERVER_ERRORS`, ותומכת בשדות `details` מובנים.
- **`Errors`**: פונקציות יצרן ייעודיות לכל השגיאות הדינמיות:
  - `Errors.invalidCredentials(remainingAttempts)`
  - `Errors.accountLocked(lockedUntil)` (מעצב שעה בשעון ישראל ומוסיף חותמת ISO ב-details)
  - `Errors.itemUnavailable(name, productIds, lineIndexes)`
  - `Errors.tooManyOpenOrders(max)`
  - `Errors.voucherNotAllowed(lineIndexes)`
  - `Errors.validation(message, field)`
  - `Errors.of(code)`
- **`lib/errors/index.ts`**: ייצוא מחדש מלא.

---

## 5. שכבת HTTP ואימות קלט (`lib/http/` ו-`lib/validation/`)
- **`lib/http/route.ts`**:
  - עטיפת `route()` הבודקת כותרת `Origin` בבקשות משנות (`POST`, `PATCH`, `PUT`, `DELETE`) ומחזירה `403 BAD_ORIGIN` במקרה אי-התאמה.
  - לכידת `AppError` והמרתו למבנה שגיאה תקני.
  - לכידת שגיאות כלליות והחזרת `500 INTERNAL` ללא חשיפת פרטי מערכת, ורישום מוגן ל-`console.error` של מתודה ונתיב בלבד.
  - הבטחת כותרת `Cache-Control: no-store` בכל תגובה.
  - פונקציית `json()` ליצירת תשובות תקניות.
- **`lib/http/body.ts`**:
  - `parseBody`: וידוא `Content-Type: application/json`, פענוח JSON מאובטח, ומיפוי שגיאות Zod ל-`AppError` מתאים (כולל תמיכה ב-`params.appCode`).
  - `parseQuery`: פענוח ואימות פרמטרי שאילתה.
  - `parseIdParam`: פענוח מזהה מספרי חיובי מפרמטרי נתיב (החזרת `404 NOT_FOUND` על מזהה שאינו תקין).
- **`lib/validation/*.ts`**:
  - סכמות Zod קשיחות (`strictObject`) הדוחות שדות עודפים, עם התאמה מלאה (`satisfies z.ZodType<TContract>`) לכל טיפוסי החוזים:
    * `common.ts`: `phoneSchema`, `fullNameSchema`, `studentPasswordSchema`, `adminPasswordSchema`, `idSchema`, `agorotSchema`, `isoDateSchema`.
    * `auth.ts`: `checkPhoneSchema`, `registerSchema` (אימות התאמת סיסמאות עם קוד `PASSWORD_MISMATCH`), `loginSchema`.
    * `account.ts`: `updateAccountSchema`, `changePasswordSchema`.
    * `users.ts`: `changeAdminPasswordSchema`, `userSearchQuerySchema`, `updateUserSchema`.
    * `kiosk.ts`: `updateKioskSchema` (שלילת שעת סגירה כאשר הקיוסק סגור).
    * `products.ts`: `createProductSchema`, `updateProductSchema`, `setProductToppingsSchema`, `setComboComponentsSchema`, `createToppingSchema`, `updateToppingSchema`.
    * `orders.ts`: `updateOrderStatusSchema`, `createOrderSchema` (הגבלת כמויות שורה, הגבלת עד 10 יחידות בהזמנה עם קוד `ORDER_TOO_LARGE`, מניעת כפילויות בתוספות, ודחיית שדות מחיר או שמות המוזנים מהלקוח).
  - `lib/validation/index.ts`: ייצוא מחדש מלא.
- **`tests/helpers/request.ts`**:
  - עזר בדיקה `callRoute` המאפשר סימולציה מלאה של קריאות שרת כולל עוגיית `kt_session`, כותרות, פרמטרים וגוף הבקשה.
- **הסבת `GET /api/health`**:
  - הנתיב הוסב לעטיפת `route()` ו-`json()` תוך שימוש ב-`new AppError('SERVICE_UNAVAILABLE')` במקרה כשל DB, ללא שינוי בהתנהגות החיצונית.

---

## 6. תוצאות הבדיקות ואימות איכות (Quality Gates)
כל שלבי האימות עברו בהצלחה מלאה:
1. **בדיקות יחידה (`npm test`):**
   - **81 בדיקות מתוך 81 עברו בהצלחה מלאה (100%)** ב-12 קובצי בדיקות.
2. **בדיקות אינטגרציה (`npm run test:integration`):**
   - **15 בדיקות מתוך 15 של ריצה 1 עברו בהצלחה מלאה** מול מסד הנתונים בענן Neon, כולל אימות `GET /api/health`.
3. **בדיקת טיפוסים (`npm run typecheck`):**
   - עבר בהצלחה עם 0 שגיאות טיפוסים (כל ה-`satisfies` אומתו).
4. **בדיקת עיצוב וקוד (`npm run lint`):**
   - עבר עם 0 שגיאות ו-0 אזהרות.
5. **הידור ייצור (`npm run build`):**
   - Next.js סיים בהצלחה יצירת Bundle אופטימלי ללא שגיאות.
6. **בדיקת איזומורפיות:**
   - אומת כי אין שום ייבוא של `server-only`, `lib/db`, `next/*` או `node:*` בתוך `lib/contracts` ו-`lib/domain`.
