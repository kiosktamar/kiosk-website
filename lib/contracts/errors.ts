// lib/contracts/errors.ts — catalog of system errors from document 00 chapter 10.
// Isomorphic: no imports from server-only code.

export const SERVER_ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'הנתונים שנשלחו אינם תקינים' },
  INVALID_PHONE: { status: 400, message: 'מספר טלפון לא תקין. יש להזין מספר נייד בן 10 ספרות' },
  INVALID_CURRENT_PASSWORD: { status: 400, message: 'הסיסמה הנוכחית שגויה' },
  PASSWORD_MISMATCH: { status: 400, message: 'הסיסמאות אינן תואמות' },
  INVALID_ORDER: { status: 400, message: 'ההזמנה אינה תקינה. רענן את התפריט ונסה שוב' },
  ORDER_TOO_LARGE: { status: 400, message: 'אפשר להזמין עד 10 יחידות בהזמנה' },
  VOUCHER_NOT_ALLOWED: { status: 400, message: 'אי אפשר לשלם בשובר על הפריט הזה' },
  INVALID_CLOSE_TIME: { status: 400, message: 'שעת הסגירה חייבת להיות בין דקה ל-10 שעות מעכשיו' },
  INVALID_STOCK_UPDATE: { status: 400, message: 'עדכון המלאי אינו תקין' },
  INVALID_TOPPING_ASSIGNMENT: { status: 400, message: 'התוספת לא מתאימה לקטגוריה של המוצר' },
  INVALID_COMBO: { status: 400, message: 'הגדרת העסקית אינה תקינה' },
  INVALID_CREDENTIALS: { status: 401, message: 'סיסמה שגויה' },
  UNAUTHENTICATED: { status: 401, message: 'ההתחברות פגה. יש להתחבר מחדש' },
  ACCOUNT_BLOCKED: { status: 403, message: 'החשבון חסום. יש לפנות לצוות הקיוסק' },
  FORBIDDEN: { status: 403, message: 'אין לך הרשאה לבצע את הפעולה הזו' },
  ADMIN_ACCOUNT_PROTECTED: { status: 403, message: 'לא ניתן לבצע פעולה זו על חשבון המנהל' },
  BAD_ORIGIN: { status: 403, message: 'הבקשה נדחתה' },
  NOT_FOUND: { status: 404, message: 'הפריט המבוקש לא נמצא' },
  USER_NOT_FOUND: { status: 404, message: 'לא נמצא משתמש עם המספר הזה' },
  PHONE_ALREADY_REGISTERED: { status: 409, message: 'המספר כבר רשום במערכת. נסה להתחבר' },
  KIOSK_CLOSED: { status: 409, message: 'הקיוסק סגור כרגע ולא ניתן לשלוח הזמנה' },
  ITEM_UNAVAILABLE: { status: 409, message: 'הפריט אזל מהמלאי' },
  TOO_MANY_OPEN_ORDERS: { status: 409, message: 'יש לך כבר יותר מדי הזמנות פתוחות' },
  ORDER_ALREADY_UPDATED: { status: 409, message: 'ההזמנה כבר עודכנה במכשיר אחר' },
  DUPLICATE_NAME: { status: 409, message: 'כבר קיים פריט בשם הזה' },
  ACCOUNT_LOCKED: { status: 423, message: 'יותר מדי ניסיונות. החשבון ננעל' },
  RATE_LIMITED: { status: 429, message: 'יותר מדי בקשות. נסה שוב בעוד דקה' },
  INTERNAL: { status: 500, message: 'משהו השתבש. נסה שוב' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'השירות אינו זמין כרגע' },
} as const;

export const CLIENT_ERRORS = {
  NETWORK_ERROR: 'אין חיבור לשרת. בדוק את החיבור ונסה שוב',
} as const;

export type ServerErrorCode = keyof typeof SERVER_ERRORS;
export type ErrorCode = ServerErrorCode | keyof typeof CLIENT_ERRORS;

export interface ApiErrorBody {
  error: {
    code: ServerErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
