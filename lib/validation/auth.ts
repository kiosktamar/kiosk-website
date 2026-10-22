// lib/validation/auth.ts — validation schemas for authentication routes.

import { z } from 'zod';
import type {
  CheckPhoneRequest,
  RegisterRequest,
  LoginRequest,
} from '@/lib/contracts/api';
import { PASSWORD_MAX } from '@/lib/contracts/limits';
import { phoneSchema, fullNameSchema, studentPasswordSchema } from './common';

export const checkPhoneSchema = z.strictObject({
  phone: phoneSchema,
}) satisfies z.ZodType<CheckPhoneRequest>;

export const registerSchema = z
  .strictObject({
    phone: phoneSchema,
    fullName: fullNameSchema,
    password: studentPasswordSchema,
    passwordConfirm: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'הסיסמאות אינן תואמות',
        path: ['passwordConfirm'],
        params: { appCode: 'PASSWORD_MISMATCH' },
      });
    }
  }) satisfies z.ZodType<RegisterRequest>;

export const loginSchema = z.strictObject({
  phone: phoneSchema,
  password: z
    .string()
    .min(1, 'יש להזין סיסמה')
    .max(PASSWORD_MAX, 'הסיסמה ארוכה מדי'),
}) satisfies z.ZodType<LoginRequest>;
