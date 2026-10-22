// lib/contracts/labels.ts — shared labels for UI and admin display.
// Isomorphic: no imports from server-only code.

export const ORDER_STATUS_LABEL = {
  student: {
    PENDING: 'בהכנה',
    READY: 'מוכנה לאיסוף',
    PAID: 'נאספה',
    CANCELED: 'בוטלה',
  },
  admin: {
    PENDING: 'ממתינה',
    READY: 'מוכנה',
    PAID: 'שולמה',
    CANCELED: 'בוטלה',
  },
} as const;

export const KIOSK_LABEL = {
  OPEN: 'פתוח',
  OPEN_UNTIL: 'פתוח עד',
  CLOSED: 'סגור',
} as const;

export const STOCK_LABEL = {
  IN_STOCK: 'במלאי',
  LIMITED: 'כמות מוגבלת',
  OUT_OF_STOCK: 'אזל',
} as const;

export const PAYMENT_LABEL = {
  CASH: 'מזומן',
  VOUCHER: 'שובר',
} as const;

export const TOPPING_KIND_LABEL = {
  TOPPING: 'תוספת',
  SAUCE: 'רוטב',
} as const;
