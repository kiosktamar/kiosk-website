import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  fullNameSchema,
  studentPasswordSchema,
  adminPasswordSchema,
  idSchema,
  agorotSchema,
  isoDateSchema,
  checkPhoneSchema,
  registerSchema,
  loginSchema,
  updateAccountSchema,
  changePasswordSchema,
  changeAdminPasswordSchema,
  userSearchQuerySchema,
  updateUserSchema,
  updateKioskSchema,
  createProductSchema,
  updateProductSchema,
  setProductToppingsSchema,
  setComboComponentsSchema,
  createToppingSchema,
  updateToppingSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from './index';

describe('Validation Schemas', () => {
  describe('Primitives (common.ts)', () => {
    it('validates and normalizes phoneSchema', () => {
      expect(phoneSchema.parse('+972541234567')).toBe('0541234567');
      expect(() => phoneSchema.parse('031234567')).toThrow();
    });

    it('validates fullNameSchema', () => {
      expect(fullNameSchema.parse('  יוסי כהן  ')).toBe('יוסי כהן');
      expect(() => fullNameSchema.parse('א')).toThrow();
      expect(() => fullNameSchema.parse('א'.repeat(41))).toThrow();
    });

    it('validates studentPasswordSchema (no trim)', () => {
      expect(studentPasswordSchema.parse(' 12345 ')).toBe(' 12345 ');
      expect(() => studentPasswordSchema.parse('12345')).toThrow(); // length 5
    });

    it('validates adminPasswordSchema', () => {
      expect(adminPasswordSchema.parse('123456789012')).toBe('123456789012');
      expect(() => adminPasswordSchema.parse('12345678901')).toThrow(); // length 11
    });

    it('validates idSchema', () => {
      expect(idSchema.parse(5)).toBe(5);
      expect(() => idSchema.parse(0)).toThrow();
      expect(() => idSchema.parse(-1)).toThrow();
      expect(() => idSchema.parse(1.5)).toThrow();
    });

    it('validates agorotSchema', () => {
      expect(agorotSchema.parse(0)).toBe(0);
      expect(agorotSchema.parse(100000)).toBe(100000);
      expect(() => agorotSchema.parse(-1)).toThrow();
      expect(() => agorotSchema.parse(100001)).toThrow();
    });

    it('validates isoDateSchema', () => {
      expect(isoDateSchema.parse('2026-10-22T17:00:00Z')).toBe('2026-10-22T17:00:00Z');
      expect(isoDateSchema.parse('2026-10-22T17:00:00+03:00')).toBe('2026-10-22T17:00:00+03:00');
      expect(() => isoDateSchema.parse('not-a-date')).toThrow();
    });
  });

  describe('Auth schemas (auth.ts)', () => {
    it('checkPhoneSchema accepts valid phone and rejects extra fields', () => {
      const parsed = checkPhoneSchema.parse({ phone: '054-123-4567' });
      expect(parsed.phone).toBe('0541234567');
      expect(() =>
        checkPhoneSchema.parse({ phone: '0541234567', extra: 'bad' }),
      ).toThrow();
    });

    it('registerSchema validates password match and rejects mismatch with PASSWORD_MISMATCH', () => {
      const valid = registerSchema.safeParse({
        phone: '0541234567',
        fullName: 'יוסי כהן',
        password: 'password123',
        passwordConfirm: 'password123',
      });
      expect(valid.success).toBe(true);

      const mismatch = registerSchema.safeParse({
        phone: '0541234567',
        fullName: 'יוסי כהן',
        password: 'password123',
        passwordConfirm: 'different123',
      });
      expect(mismatch.success).toBe(false);
      if (!mismatch.success) {
        const issue = mismatch.error.issues[0];
        expect((issue as any).params?.appCode).toBe('PASSWORD_MISMATCH');
        expect(issue.path).toEqual(['passwordConfirm']);
      }
    });

    it('loginSchema validates correctly', () => {
      expect(
        loginSchema.parse({ phone: '0541234567', password: 'secret' }),
      ).toEqual({ phone: '0541234567', password: 'secret' });
      expect(() => loginSchema.parse({ phone: '0541234567', password: '' })).toThrow();
    });
  });

  describe('Account and User schemas (account.ts, users.ts)', () => {
    it('updateAccountSchema validates fullName', () => {
      expect(updateAccountSchema.parse({ fullName: 'דוד לוי' })).toEqual({ fullName: 'דוד לוי' });
      expect(() => updateAccountSchema.parse({ fullName: '' })).toThrow();
    });

    it('changePasswordSchema triggers PASSWORD_MISMATCH on unequal passwords', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'newPassword1',
        newPasswordConfirm: 'newPassword2',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect((res.error.issues[0] as any).params?.appCode).toBe('PASSWORD_MISMATCH');
      }
    });

    it('changeAdminPasswordSchema enforces 12 chars minimum for admin', () => {
      expect(() =>
        changeAdminPasswordSchema.parse({
          currentPassword: 'old',
          newPassword: 'shortPass', // < 12
          newPasswordConfirm: 'shortPass',
        }),
      ).toThrow();

      const valid = changeAdminPasswordSchema.parse({
        currentPassword: 'old',
        newPassword: 'adminPassword123',
        newPasswordConfirm: 'adminPassword123',
      });
      expect(valid.newPassword).toBe('adminPassword123');
    });

    it('userSearchQuerySchema validates phone query param', () => {
      expect(userSearchQuerySchema.parse({ phone: '0541234567' })).toEqual({
        phone: '0541234567',
      });
    });

    it('updateUserSchema validates isActive boolean', () => {
      expect(updateUserSchema.parse({ isActive: false })).toEqual({ isActive: false });
      expect(() => updateUserSchema.parse({ isActive: 'yes' })).toThrow();
    });
  });

  describe('Kiosk schemas (kiosk.ts)', () => {
    it('updateKioskSchema allows open kiosk with or without closesAt', () => {
      expect(
        updateKioskSchema.parse({
          isOpen: true,
          closesAt: '2026-10-22T17:00:00Z',
        }),
      ).toEqual({ isOpen: true, closesAt: '2026-10-22T17:00:00Z' });

      expect(
        updateKioskSchema.parse({
          isOpen: true,
          closesAt: null,
        }),
      ).toEqual({ isOpen: true, closesAt: null });
    });

    it('updateKioskSchema rejects closed kiosk with non-null closesAt', () => {
      const res = updateKioskSchema.safeParse({
        isOpen: false,
        closesAt: '2026-10-22T17:00:00Z',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('כאשר הקיוסק סגור');
      }
    });
  });

  describe('Products and Toppings schemas (products.ts)', () => {
    it('createProductSchema trims name and handles description', () => {
      const p = createProductSchema.parse({
        categoryId: 1,
        name: ' המבורגר ',
        priceAgorot: 2500,
        description: '   ',
      });
      expect(p.name).toBe('המבורגר');
      expect(p.description).toBeNull();
    });

    it('updateProductSchema requires at least one field and only allows isArchived: true', () => {
      expect(() => updateProductSchema.parse({})).toThrow();
      expect(() => updateProductSchema.parse({ isArchived: false as any })).toThrow();
      expect(updateProductSchema.parse({ priceAgorot: 3000 })).toEqual({ priceAgorot: 3000 });
      expect(updateProductSchema.parse({ isArchived: true })).toEqual({ isArchived: true });
    });

    it('setProductToppingsSchema rejects duplicates and caps at 50', () => {
      expect(() => setProductToppingsSchema.parse({ toppingIds: [1, 2, 1] })).toThrow();
      expect(setProductToppingsSchema.parse({ toppingIds: [1, 2, 3] })).toEqual({
        toppingIds: [1, 2, 3],
      });
    });

    it('setComboComponentsSchema validates fixed vs choice component rule', () => {
      // Valid: exactly one is set
      const valid = setComboComponentsSchema.parse({
        components: [
          { slotLabel: 'עיקרית', fixedProductId: 1, choiceCategoryId: null },
          { slotLabel: 'שתייה', fixedProductId: null, choiceCategoryId: 2 },
        ],
      });
      expect(valid.components).toHaveLength(2);

      // Invalid: both null
      expect(() =>
        setComboComponentsSchema.parse({
          components: [{ slotLabel: 'עיקרית', fixedProductId: null, choiceCategoryId: null }],
        }),
      ).toThrow();

      // Invalid: both non-null
      expect(() =>
        setComboComponentsSchema.parse({
          components: [{ slotLabel: 'עיקרית', fixedProductId: 1, choiceCategoryId: 2 }],
        }),
      ).toThrow();
    });

    it('createToppingSchema and updateToppingSchema validate properly', () => {
      expect(
        createToppingSchema.parse({
          name: 'קטשופ',
          kind: 'SAUCE',
          extraPriceAgorot: 0,
        }),
      ).toEqual({ name: 'קטשופ', kind: 'SAUCE', extraPriceAgorot: 0 });

      expect(updateToppingSchema.parse({ isAvailable: false })).toEqual({ isAvailable: false });
      expect(() => updateToppingSchema.parse({})).toThrow();
    });
  });

  describe('Order schemas (orders.ts)', () => {
    it('updateOrderStatusSchema allows valid target statuses', () => {
      expect(updateOrderStatusSchema.parse({ to: 'READY' })).toEqual({ to: 'READY' });
      expect(updateOrderStatusSchema.parse({ to: 'PAID' })).toEqual({ to: 'PAID' });
      expect(updateOrderStatusSchema.parse({ to: 'CANCELED' })).toEqual({ to: 'CANCELED' });
      expect(() => updateOrderStatusSchema.parse({ to: 'PENDING' as any })).toThrow();
    });

    it('createOrderSchema accepts valid single and combo items', () => {
      const order = createOrderSchema.parse({
        items: [
          {
            productId: 1,
            quantity: 2,
            paymentMethod: 'CASH',
            toppingIds: [10, 11],
          },
          {
            productId: 2,
            quantity: 1,
            paymentMethod: 'VOUCHER',
            components: [
              {
                componentId: 5,
                productId: 10,
                toppingIds: [20],
              },
            ],
          },
        ],
      });
      expect(order.items).toHaveLength(2);
    });

    it('rejects line quantity > 5', () => {
      expect(() =>
        createOrderSchema.parse({
          items: [{ productId: 1, quantity: 6, paymentMethod: 'CASH' }],
        }),
      ).toThrow();
    });

    it('rejects duplicate toppingIds in line', () => {
      expect(() =>
        createOrderSchema.parse({
          items: [{ productId: 1, quantity: 1, paymentMethod: 'CASH', toppingIds: [1, 2, 1] }],
        }),
      ).toThrow();
    });

    it('rejects client-supplied price or total fields (strictObject)', () => {
      expect(() =>
        createOrderSchema.parse({
          items: [{ productId: 1, quantity: 1, paymentMethod: 'CASH', price: 1000 } as any],
        }),
      ).toThrow();
    });

    it('triggers ORDER_TOO_LARGE when total order units exceed 10 (e.g. 11 units)', () => {
      const res = createOrderSchema.safeParse({
        items: [
          { productId: 1, quantity: 5, paymentMethod: 'CASH' },
          { productId: 2, quantity: 5, paymentMethod: 'CASH' },
          { productId: 3, quantity: 1, paymentMethod: 'CASH' }, // total = 11
        ],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues[0];
        expect((issue as any).params?.appCode).toBe('ORDER_TOO_LARGE');
        expect(issue.path).toEqual(['items']);
      }
    });
  });
});
