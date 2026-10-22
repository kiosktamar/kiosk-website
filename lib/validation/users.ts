// lib/validation/users.ts — validation schemas for admin user management.

import { z } from 'zod';
import type {
  ChangeAdminPasswordRequest,
  UpdateUserRequest,
} from '@/lib/contracts/api';
import { PASSWORD_MAX } from '@/lib/contracts/limits';
import { phoneSchema, adminPasswordSchema } from './common';

export const changeAdminPasswordSchema = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, 'יש להזין סיסמה נוכחית')
      .max(PASSWORD_MAX, 'הסיסמה ארוכה מדי'),
    newPassword: adminPasswordSchema,
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
  }) satisfies z.ZodType<ChangeAdminPasswordRequest>;

export const userSearchQuerySchema = z.strictObject({
  phone: phoneSchema,
});

export const updateUserSchema = z.strictObject({
  isActive: z.boolean({
    error: 'סטטוס חייב להיות בוליאני',
  }),
}) satisfies z.ZodType<UpdateUserRequest>;
