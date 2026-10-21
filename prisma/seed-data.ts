import bcrypt from 'bcryptjs';
import type { PrismaClient } from '../lib/generated/prisma/client';

export interface SeedOptions {
  adminPhone: string;
  adminPassword: string;
}

export async function seedDatabase(prisma: PrismaClient, opts: SeedOptions): Promise<void> {
  // 1. KioskSettings (Single row id = 1)
  const existingSettings = await prisma.kioskSettings.findUnique({
    where: { id: 1 },
  });

  if (!existingSettings) {
    await prisma.kioskSettings.create({
      data: {
        id: 1,
        is_open: false,
        closes_at: null,
        max_open_orders: 2,
      },
    });
  }

  // 2. Admin User
  const existingAdmin = await prisma.users.findUnique({
    where: { phone: opts.adminPhone },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(opts.adminPassword, 10);
    await prisma.users.create({
      data: {
        phone: opts.adminPhone,
        full_name: 'צוות הקיוסק',
        role: 'ADMIN',
        password_hash: passwordHash,
        is_active: true,
      },
    });
  }

  // 3. Categories
  const categoryDefs = [
    { name: 'מנות עיקריות', sort_order: 1, allows_toppings: true, allows_sauces: true },
    { name: "צ'יפס ותוספות", sort_order: 2, allows_toppings: false, allows_sauces: true },
    { name: 'שתייה', sort_order: 3, allows_toppings: false, allows_sauces: false },
    { name: 'עסקיות', sort_order: 4, allows_toppings: false, allows_sauces: false },
  ];

  const categoriesByName: Record<string, number> = {};

  for (const cat of categoryDefs) {
    let category = await prisma.categories.findUnique({
      where: { name: cat.name },
    });

    if (!category) {
      category = await prisma.categories.create({
        data: cat,
      });
    }

    categoriesByName[cat.name] = category.category_id;
  }

  // 4. Products
  const productDefs = [
    {
      categoryName: 'מנות עיקריות',
      name: 'המבורגר',
      description: null,
      price_agorot: 2500,
      product_type: 'SINGLE' as const,
      accepts_voucher: true,
      sort_order: 1,
    },
    {
      categoryName: 'מנות עיקריות',
      name: 'נקניקייה',
      description: null,
      price_agorot: 1800,
      product_type: 'SINGLE' as const,
      accepts_voucher: true,
      sort_order: 2,
    },
    {
      categoryName: "צ'יפס ותוספות",
      name: "צ'יפס",
      description: null,
      price_agorot: 1000,
      product_type: 'SINGLE' as const,
      accepts_voucher: false,
      sort_order: 1,
    },
    {
      categoryName: 'שתייה',
      name: 'קולה',
      description: null,
      price_agorot: 700,
      product_type: 'SINGLE' as const,
      accepts_voucher: false,
      sort_order: 1,
    },
    {
      categoryName: 'שתייה',
      name: 'קולה זירו',
      description: null,
      price_agorot: 700,
      product_type: 'SINGLE' as const,
      accepts_voucher: false,
      sort_order: 2,
    },
    {
      categoryName: 'שתייה',
      name: 'ספרייט',
      description: null,
      price_agorot: 700,
      product_type: 'SINGLE' as const,
      accepts_voucher: false,
      sort_order: 3,
    },
    {
      categoryName: 'עסקיות',
      name: 'עסקית המבורגר',
      description: "המבורגר + צ'יפס + פחית",
      price_agorot: 3500,
      product_type: 'COMBO' as const,
      accepts_voucher: false,
      sort_order: 1,
    },
    {
      categoryName: 'עסקיות',
      name: 'עסקית נקניקייה',
      description: "נקניקייה + צ'יפס + פחית",
      price_agorot: 2800,
      product_type: 'COMBO' as const,
      accepts_voucher: false,
      sort_order: 2,
    },
  ];

  const productsByName: Record<string, number> = {};

  for (const prod of productDefs) {
    const categoryId = categoriesByName[prod.categoryName];
    let product = await prisma.products.findUnique({
      where: {
        category_id_name: {
          category_id: categoryId,
          name: prod.name,
        },
      },
    });

    if (!product) {
      product = await prisma.products.create({
        data: {
          category_id: categoryId,
          name: prod.name,
          description: prod.description,
          price_agorot: prod.price_agorot,
          product_type: prod.product_type,
          accepts_voucher: prod.accepts_voucher,
          stock_status: 'IN_STOCK',
          stock_count: null,
          sort_order: prod.sort_order,
        },
      });
    }

    productsByName[prod.name] = product.product_id;
  }

  // 5. Toppings & Sauces
  const toppingDefs = [
    { kind: 'TOPPING' as const, name: 'חסה', extra_price_agorot: 0, sort_order: 1 },
    { kind: 'TOPPING' as const, name: 'עגבנייה', extra_price_agorot: 0, sort_order: 2 },
    { kind: 'TOPPING' as const, name: 'מלפפון חמוץ', extra_price_agorot: 0, sort_order: 3 },
    { kind: 'TOPPING' as const, name: 'בצל מטוגן', extra_price_agorot: 200, sort_order: 4 },
    { kind: 'SAUCE' as const, name: 'קטשופ', extra_price_agorot: 0, sort_order: 1 },
    { kind: 'SAUCE' as const, name: 'מיונז', extra_price_agorot: 0, sort_order: 2 },
    { kind: 'SAUCE' as const, name: 'חרדל', extra_price_agorot: 0, sort_order: 3 },
    { kind: 'SAUCE' as const, name: "צ'ילי", extra_price_agorot: 0, sort_order: 4 },
  ];

  const toppingsByName: Record<string, number> = {};
  const toppingIds: number[] = [];
  const sauceIds: number[] = [];

  for (const top of toppingDefs) {
    let topping = await prisma.toppings.findUnique({
      where: {
        kind_name: {
          kind: top.kind,
          name: top.name,
        },
      },
    });

    if (!topping) {
      topping = await prisma.toppings.create({
        data: {
          kind: top.kind,
          name: top.name,
          extra_price_agorot: top.extra_price_agorot,
          is_available: true,
          sort_order: top.sort_order,
        },
      });
    }

    toppingsByName[top.name] = topping.topping_id;
    if (top.kind === 'TOPPING') {
      toppingIds.push(topping.topping_id);
    } else {
      sauceIds.push(topping.topping_id);
    }
  }

  // 6. Product Toppings Association (created only if product has NO toppings yet)
  const allToppingsAndSauces = [...toppingIds, ...sauceIds];

  const associationsToSeed = [
    { productName: 'המבורגר', toppingIds: allToppingsAndSauces },
    { productName: 'נקניקייה', toppingIds: allToppingsAndSauces },
    { productName: "צ'יפס", toppingIds: sauceIds },
  ];

  for (const assoc of associationsToSeed) {
    const productId = productsByName[assoc.productName];
    if (!productId) continue;

    const existingCount = await prisma.productToppings.count({
      where: { product_id: productId },
    });

    if (existingCount === 0) {
      await prisma.productToppings.createMany({
        data: assoc.toppingIds.map((tId) => ({
          product_id: productId,
          topping_id: tId,
        })),
      });
    }
  }

  // 7. Combo Components (created only if combo has NO components yet)
  const combosToSeed = [
    {
      comboName: 'עסקית המבורגר',
      components: [
        { sort_order: 1, slot_label: 'מנה עיקרית', fixedProductName: 'המבורגר', choiceCategoryName: null },
        { sort_order: 2, slot_label: 'תוספת', fixedProductName: "צ'יפס", choiceCategoryName: null },
        { sort_order: 3, slot_label: 'שתייה', fixedProductName: null, choiceCategoryName: 'שתייה' },
      ],
    },
    {
      comboName: 'עסקית נקניקייה',
      components: [
        { sort_order: 1, slot_label: 'מנה עיקרית', fixedProductName: 'נקניקייה', choiceCategoryName: null },
        { sort_order: 2, slot_label: 'תוספת', fixedProductName: "צ'יפס", choiceCategoryName: null },
        { sort_order: 3, slot_label: 'שתייה', fixedProductName: null, choiceCategoryName: 'שתייה' },
      ],
    },
  ];

  for (const combo of combosToSeed) {
    const comboId = productsByName[combo.comboName];
    if (!comboId) continue;

    const existingCount = await prisma.comboComponents.count({
      where: { combo_id: comboId },
    });

    if (existingCount === 0) {
      for (const comp of combo.components) {
        await prisma.comboComponents.create({
          data: {
            combo_id: comboId,
            sort_order: comp.sort_order,
            slot_label: comp.slot_label,
            fixed_product_id: comp.fixedProductName ? productsByName[comp.fixedProductName] : null,
            choice_category_id: comp.choiceCategoryName ? categoriesByName[comp.choiceCategoryName] : null,
          },
        });
      }
    }
  }
}
