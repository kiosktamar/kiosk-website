// lib/validation/common.ts — reusable validation schemas for primitives.

import { z } from 'zod';
import { PhoneNumber } from '@/lib/domain/PhoneNumber';
import {
  NAME_MIN,
  NAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
  ADMIN_PASSWORD_MIN,
  PRICE_MAX_AGOROT,
} from '@/lib/contracts/limits';

export const phoneSchema = z.string().transform((val, ctx) => {
  const parsed = PhoneNumber.tryParse(val);
  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'מספר טלפון לא תקין. יש להזין מספר נייד בן 10 ספרות',
      params: { appCode: 'INVALID_PHONE' },
    });
    return z.NEVER;
  }
  return parsed.value;
});

export const fullNameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, `השם חייב להכיל ${NAME_MIN} עד ${NAME_MAX} תווים`)
  .max(NAME_MAX, `השם חייב להכיל ${NAME_MIN} עד ${NAME_MAX} תווים`);

export const studentPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `הסיסמה חייבת להכיל ${PASSWORD_MIN} עד ${PASSWORD_MAX} תווים`)
  .max(PASSWORD_MAX, `הסיסמה חייבת להכיל ${PASSWORD_MIN} עד ${PASSWORD_MAX} תווים`);

export const adminPasswordSchema = z
  .string()
  .min(ADMIN_PASSWORD_MIN, `הסיסמה חייבת להכיל ${ADMIN_PASSWORD_MIN} עד ${PASSWORD_MAX} תווים`)
  .max(PASSWORD_MAX, `הסיסמה חייבת להכיל ${ADMIN_PASSWORD_MIN} עד ${PASSWORD_MAX} תווים`);

export const idSchema = z
  .number()
  .int('מזהה חייב להיות מספר שלם')
  .positive('מזהה חייב להיות חיובי');

export const agorotSchema = z
  .number()
  .int('מחיר חייב להיות מספר שלם')
  .min(0, 'מחיר לא יכול להיות שלילי')
  .max(PRICE_MAX_AGOROT, 'מחיר חורג מהמקסימום המותר');

export const isoDateSchema = z.iso.datetime({
  offset: true,
  message: 'תאריך אינו תקין',
});
