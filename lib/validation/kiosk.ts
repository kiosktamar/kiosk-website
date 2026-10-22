// lib/validation/kiosk.ts — validation schema for kiosk open/close status.

import { z } from 'zod';
import type { UpdateKioskRequest } from '@/lib/contracts/api';
import { isoDateSchema } from './common';

export const updateKioskSchema = z
  .strictObject({
    isOpen: z.boolean({
      error: 'מצב הקיוסק חייב להיות בוליאני',
    }),
    closesAt: isoDateSchema.nullable(),
  })
  .superRefine((val, ctx) => {
    if (!val.isOpen && val.closesAt !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'כאשר הקיוסק סגור, שעת הסגירה חייבת להיות ריקה',
        path: ['closesAt'],
      });
    }
  }) satisfies z.ZodType<UpdateKioskRequest>;
