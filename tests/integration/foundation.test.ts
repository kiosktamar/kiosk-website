import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { testPrisma, resetDatabase } from '@/tests/helpers/db';
import { seedDatabase } from '@/prisma/seed-data';

describe('Run 01 — Foundation & Integration Tests', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('GET /api/health returns 200 and { ok: true }', async () => {
    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('resetDatabase sets up exact seed record counts', async () => {
    const categoriesCount = await testPrisma.categories.count();
    const productsCount = await testPrisma.products.count();
    const toppingsCount = await testPrisma.toppings.count();
    const comboComponentsCount = await testPrisma.comboComponents.count();
    const kioskSettingsCount = await testPrisma.kioskSettings.count();
    const adminCount = await testPrisma.users.count({ where: { role: 'ADMIN' } });

    expect(categoriesCount).toBe(4);
    expect(productsCount).toBe(8);
    expect(toppingsCount).toBe(8);
    expect(comboComponentsCount).toBe(6);
    expect(kioskSettingsCount).toBe(1);
    expect(adminCount).toBe(1);
  });

  it('second run of seedDatabase is idempotent and preserves updated price', async () => {
    // Modify one product's price
    const burger = await testPrisma.products.findFirstOrThrow({
      where: { name: 'המבורגר' },
    });

    await testPrisma.products.update({
      where: { product_id: burger.product_id },
      data: { price_agorot: 3200 },
    });

    // Run seed again
    await seedDatabase(testPrisma, {
      adminPhone: process.env.ADMIN_PHONE || '0500000000',
      adminPassword: process.env.ADMIN_PASSWORD || 'admin-password-123',
    });

    // Counts remain identical
    expect(await testPrisma.categories.count()).toBe(4);
    expect(await testPrisma.products.count()).toBe(8);
    expect(await testPrisma.toppings.count()).toBe(8);
    expect(await testPrisma.comboComponents.count()).toBe(6);

    // Modified price is preserved
    const burgerAfter = await testPrisma.products.findUniqueOrThrow({
      where: { product_id: burger.product_id },
    });
    expect(burgerAfter.price_agorot).toBe(3200);
  });

  describe('CHECK Constraints Validation', () => {
    it('fails when LIMITED product has stock_count = null', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      await expect(
        testPrisma.products.create({
          data: {
            category_id: cat.category_id,
            name: 'מנה מוגבלת ללא כמות',
            price_agorot: 2000,
            stock_status: 'LIMITED',
            stock_count: null,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when IN_STOCK product has stock_count set', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      await expect(
        testPrisma.products.create({
          data: {
            category_id: cat.category_id,
            name: 'מנה במלאי עם כמות',
            price_agorot: 2000,
            stock_status: 'IN_STOCK',
            stock_count: 3,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when COMBO product accepts voucher', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      await expect(
        testPrisma.products.create({
          data: {
            category_id: cat.category_id,
            name: 'עסקית עם שובר',
            price_agorot: 3000,
            product_type: 'COMBO',
            accepts_voucher: true,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when COMBO product has stock_status = LIMITED', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      await expect(
        testPrisma.products.create({
          data: {
            category_id: cat.category_id,
            name: 'עסקית מוגבלת',
            price_agorot: 3000,
            product_type: 'COMBO',
            stock_status: 'LIMITED',
            stock_count: 5,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when price is negative', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      await expect(
        testPrisma.products.create({
          data: {
            category_id: cat.category_id,
            name: 'מחיר שלילי',
            price_agorot: -100,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when ComboComponent has both fixed_product and choice_category or neither', async () => {
      const combo = await testPrisma.products.findFirstOrThrow({
        where: { product_type: 'COMBO' },
      });
      const single = await testPrisma.products.findFirstOrThrow({
        where: { product_type: 'SINGLE' },
      });
      const cat = await testPrisma.categories.findFirstOrThrow();

      // Both set
      await expect(
        testPrisma.comboComponents.create({
          data: {
            combo_id: combo.product_id,
            slot_label: 'לא תקין',
            sort_order: 99,
            fixed_product_id: single.product_id,
            choice_category_id: cat.category_id,
          },
        }),
      ).rejects.toThrow();

      // Neither set
      await expect(
        testPrisma.comboComponents.create({
          data: {
            combo_id: combo.product_id,
            slot_label: 'לא תקין 2',
            sort_order: 100,
            fixed_product_id: null,
            choice_category_id: null,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when inserting second row in KioskSettings (id != 1)', async () => {
      await expect(
        testPrisma.kioskSettings.create({
          data: {
            id: 2,
            is_open: true,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when order status is PAID but closed_at is null', async () => {
      const user = await testPrisma.users.findFirstOrThrow();
      await expect(
        testPrisma.orders.create({
          data: {
            order_code: 'abcd',
            user_id: user.user_id,
            status: 'PAID',
            closed_at: null,
            total_agorot: 1000,
            cash_due_agorot: 1000,
            voucher_count: 0,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when OrderItem has parent_item_id AND payment_method', async () => {
      const user = await testPrisma.users.findFirstOrThrow();
      const product = await testPrisma.products.findFirstOrThrow();

      const order = await testPrisma.orders.create({
        data: {
          order_code: 'wxy2',
          user_id: user.user_id,
          status: 'PENDING',
          total_agorot: 1000,
          cash_due_agorot: 1000,
          voucher_count: 0,
        },
      });

      const parentItem = await testPrisma.orderItems.create({
        data: {
          order_id: order.order_id,
          product_id: product.product_id,
          product_name: product.name,
          unit_price_agorot: 1000,
          quantity: 1,
          payment_method: 'CASH',
          line_total_agorot: 1000,
        },
      });

      await expect(
        testPrisma.orderItems.create({
          data: {
            order_id: order.order_id,
            parent_item_id: parentItem.order_item_id,
            product_id: product.product_id,
            product_name: product.name,
            unit_price_agorot: 0,
            quantity: 1,
            payment_method: 'CASH', // Child must NOT have payment_method
            line_total_agorot: 0,
          },
        }),
      ).rejects.toThrow();
    });

    it('fails when user phone format is invalid (e.g. 0312345678)', async () => {
      await expect(
        testPrisma.users.create({
          data: {
            phone: '0312345678',
            full_name: 'יוסי כהן',
            password_hash: 'dummyhash123456',
            role: 'STUDENT',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Transactions & Concurrency', () => {
    it('rolls back interactive transactions on error', async () => {
      const burger = await testPrisma.products.findFirstOrThrow({
        where: { name: 'המבורגר' },
      });
      const originalPrice = burger.price_agorot;

      await expect(
        testPrisma.$transaction(async (tx) => {
          await tx.products.update({
            where: { product_id: burger.product_id },
            data: { price_agorot: 9999 },
          });
          throw new Error('Forced rollback error');
        }),
      ).rejects.toThrow('Forced rollback error');

      const burgerAfter = await testPrisma.products.findUniqueOrThrow({
        where: { product_id: burger.product_id },
      });
      expect(burgerAfter.price_agorot).toBe(originalPrice);
    });

    it('performs atomic conditional updateMany decrement concurrently', async () => {
      const cat = await testPrisma.categories.findFirstOrThrow();
      const product = await testPrisma.products.create({
        data: {
          category_id: cat.category_id,
          name: 'פריט מלאי מוגבל בדיקה',
          price_agorot: 1500,
          stock_status: 'LIMITED',
          stock_count: 1,
        },
      });

      // Two concurrent decrements when stock is 1
      const [res1, res2] = await Promise.all([
        testPrisma.products.updateMany({
          where: {
            product_id: product.product_id,
            stock_count: { gte: 1 },
          },
          data: {
            stock_count: { decrement: 1 },
          },
        }),
        testPrisma.products.updateMany({
          where: {
            product_id: product.product_id,
            stock_count: { gte: 1 },
          },
          data: {
            stock_count: { decrement: 1 },
          },
        }),
      ]);

      const totalUpdated = res1.count + res2.count;
      expect(totalUpdated).toBe(1);

      const finalProduct = await testPrisma.products.findUniqueOrThrow({
        where: { product_id: product.product_id },
      });
      expect(finalProduct.stock_count).toBe(0);
    });
  });
});
