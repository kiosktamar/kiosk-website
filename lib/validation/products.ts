// lib/validation/products.ts — validation schemas for products and toppings admin operations.

import { z } from 'zod';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  SetProductToppingsRequest,
  SetComboComponentsRequest,
  CreateToppingRequest,
  UpdateToppingRequest,
} from '@/lib/contracts/api';
import {
  PRODUCT_NAME_MAX,
  DESCRIPTION_MAX,
  TOPPING_NAME_MAX,
  SLOT_LABEL_MAX,
} from '@/lib/contracts/limits';
import { idSchema, agorotSchema } from './common';

export const createProductSchema = z.strictObject({
  categoryId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, 'שם הפריט לא יכול להיות ריק')
    .max(PRODUCT_NAME_MAX, `שם הפריט חייב להכיל עד ${PRODUCT_NAME_MAX} תווים`),
  priceAgorot: agorotSchema,
  productType: z.enum(['SINGLE', 'COMBO']).optional(),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `התיאור יכול להכיל עד ${DESCRIPTION_MAX} תווים`)
    .nullable()
    .optional()
    .transform((v) => (!v ? null : v)),
}) satisfies z.ZodType<CreateProductRequest>;

export const updateProductSchema = z
  .strictObject({
    priceAgorot: agorotSchema.optional(),
    stockStatus: z.enum(['IN_STOCK', 'LIMITED', 'OUT_OF_STOCK']).optional(),
    stockCount: z
      .number()
      .int('כמות מלאי חייבת להיות מספר שלם')
      .min(0, 'כמות מלאי לא יכולה להיות שלילית')
      .max(100_000, 'כמות מלאי חורגת מהמקסימום')
      .optional(),
    acceptsVoucher: z.boolean().optional(),
    isArchived: z.literal(true, { error: 'ארכוב פריט הוא חד-כיווני' }).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'יש לעדכן לפחות שדה אחד',
  }) satisfies z.ZodType<UpdateProductRequest>;

export const setProductToppingsSchema = z.strictObject({
  toppingIds: z
    .array(idSchema)
    .max(50, 'ניתן לשייך עד 50 תוספות')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'מזהי תוספות לא יכולים להופיע פעמיים',
    }),
}) satisfies z.ZodType<SetProductToppingsRequest>;

export const setComboComponentsSchema = z.strictObject({
  components: z
    .array(
      z
        .strictObject({
          slotLabel: z
            .string()
            .trim()
            .min(1, 'תווית לא יכולה להיות ריקה')
            .max(SLOT_LABEL_MAX, `תווית עד ${SLOT_LABEL_MAX} תווים`),
          fixedProductId: idSchema.nullable(),
          choiceCategoryId: idSchema.nullable(),
        })
        .refine(
          (c) =>
            (c.fixedProductId !== null && c.choiceCategoryId === null) ||
            (c.fixedProductId === null && c.choiceCategoryId !== null),
          {
            message: 'רכיב עסקית חייב להכיל בדיוק אחד מ-מוצר קבוע או קטגוריה לבחירה',
          },
        ),
    )
    .min(1, 'עסקית חייבת להכיל לפחות רכיב אחד')
    .max(5, 'עסקית יכולה להכיל עד 5 רכיבים'),
}) satisfies z.ZodType<SetComboComponentsRequest>;

export const createToppingSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'שם לא יכול להיות ריק')
    .max(TOPPING_NAME_MAX, `שם עד ${TOPPING_NAME_MAX} תווים`),
  kind: z.enum(['TOPPING', 'SAUCE']),
  extraPriceAgorot: agorotSchema,
}) satisfies z.ZodType<CreateToppingRequest>;

export const updateToppingSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1, 'שם לא יכול להיות ריק')
      .max(TOPPING_NAME_MAX, `שם עד ${TOPPING_NAME_MAX} תווים`)
      .optional(),
    extraPriceAgorot: agorotSchema.optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'יש לעדכן לפחות שדה אחד',
  }) satisfies z.ZodType<UpdateToppingRequest>;
