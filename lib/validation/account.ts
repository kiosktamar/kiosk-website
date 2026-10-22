// lib/validation/account.ts — validation schemas for account settings.

import { z } from 'zod';
import type { UpdateAccountRequest, ChangePasswordRequest } from '@/lib/contracts/api';
import { PASSWORD_MAX } from '@/lib/contracts/limits';
import { fullNameSchema, studentPasswordSchema } from './common';

export const updateAccountSchema = z.strictObject({
  fullName: fullNameSchema,
}) satisfies z.ZodType<UpdateAccountRequest>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, 'יש להזין סיסמה נוכחית')
      .max(PASSWORD_MAX, 'הסיסמה ארוכה מדי'),
    newPassword: studentPasswordSchema,
    newPasswordConfirm: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'הסיסמאות אינן תואמות',
        path: ['newPasswordConfirm'],
        params: { appCode: 'PASSWORD_MISMATCH' },
      });
    }
  }) satisfies z.ZodType<ChangePasswordRequest>;
