// lib/validation/orders.ts — validation schemas for order creation and updates.

import { z } from 'zod';
import type {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
} from '@/lib/contracts/api';
import {
  LINE_QTY_MIN,
  LINE_QTY_MAX,
  ORDER_UNITS_MAX,
} from '@/lib/contracts/limits';
import { idSchema } from './common';

export const updateOrderStatusSchema = z.strictObject({
  to: z.enum(['READY', 'PAID', 'CANCELED']),
}) satisfies z.ZodType<UpdateOrderStatusRequest>;

const orderComponentSelectionSchema = z.strictObject({
  componentId: idSchema,
  productId: idSchema.optional(),
  toppingIds: z
    .array(idSchema)
    .max(20, 'ניתן לבחור עד 20 תוספות לרכיב')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'כפילות בתוספות',
    })
    .optional(),
});

const orderLineRequestSchema = z.strictObject({
  productId: idSchema,
  quantity: z
    .number()
    .int('כמות חייבת להיות מספר שלם')
    .min(LINE_QTY_MIN, 'אפשר להזמין 1 עד 5 יחידות מכל פריט')
    .max(LINE_QTY_MAX, 'אפשר להזמין 1 עד 5 יחידות מכל פריט'),
  paymentMethod: z.enum(['CASH', 'VOUCHER']),
  toppingIds: z
    .array(idSchema)
    .max(20, 'ניתן לבחור עד 20 תוספות לפריט')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'כפילות בתוספות',
    })
    .optional(),
  components: z.array(orderComponentSelectionSchema).max(5, 'עד 5 רכיבים לעסקית').optional(),
});

export const createOrderSchema = z
  .strictObject({
    items: z
      .array(orderLineRequestSchema)
      .min(1, 'ההזמנה חייבת לכלול לפחות פריט אחד')
      .max(10, 'אפשר להזמין עד 10 שורות בהזמנה'),
  })
  .superRefine((val, ctx) => {
    const totalUnits = val.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalUnits > ORDER_UNITS_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'אפשר להזמין עד 10 יחידות בהזמנה',
        path: ['items'],
        params: { appCode: 'ORDER_TOO_LARGE' },
      });
    }
  }) satisfies z.ZodType<CreateOrderRequest>;
