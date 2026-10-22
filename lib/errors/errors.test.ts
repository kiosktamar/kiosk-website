import { describe, it, expect } from 'vitest';
import { Errors } from './errors';

describe('Errors factory functions', () => {
  it('creates invalidCredentials error with and without remaining attempts', () => {
    const withAttempts = Errors.invalidCredentials(3);
    expect(withAttempts.code).toBe('INVALID_CREDENTIALS');
    expect(withAttempts.httpStatus).toBe(401);
    expect(withAttempts.message).toBe('סיסמה שגויה. נותרו 3 ניסיונות לפני נעילת החשבון');
    expect(withAttempts.details).toEqual({ remainingAttempts: 3 });

    const withoutAttempts = Errors.invalidCredentials();
    expect(withoutAttempts.code).toBe('INVALID_CREDENTIALS');
    expect(withoutAttempts.message).toBe('סיסמה שגויה');
    expect(withoutAttempts.details).toBeUndefined();
  });

  it('creates accountLocked with Israel time formatting and ISO string in details', () => {
    // 2026-07-15 12:30 UTC -> summer in Israel (+3) -> 15:30
    const lockedUntil = new Date('2026-07-15T12:30:00Z');
    const err = Errors.accountLocked(lockedUntil);
    expect(err.code).toBe('ACCOUNT_LOCKED');
    expect(err.httpStatus).toBe(423);
    expect(err.message).toBe('יותר מדי ניסיונות. החשבון ננעל עד 15:30');
    expect(err.details).toEqual({ lockedUntil: lockedUntil.toISOString() });
  });

  it('creates itemUnavailable with name and details', () => {
    const err = Errors.itemUnavailable('המבורגר', [10], [0]);
    expect(err.code).toBe('ITEM_UNAVAILABLE');
    expect(err.httpStatus).toBe(409);
    expect(err.message).toBe('"המבורגר" אזל מהמלאי');
    expect(err.details).toEqual({ productIds: [10], lineIndexes: [0] });
  });

  it('creates tooManyOpenOrders with max and details', () => {
    const err = Errors.tooManyOpenOrders(2);
    expect(err.code).toBe('TOO_MANY_OPEN_ORDERS');
    expect(err.httpStatus).toBe(409);
    expect(err.message).toBe('יש לך כבר 2 הזמנות פתוחות. אפשר להזמין שוב אחרי שאחת תיאסף');
    expect(err.details).toEqual({ max: 2 });
  });

  it('creates voucherNotAllowed', () => {
    const err = Errors.voucherNotAllowed([1, 2]);
    expect(err.code).toBe('VOUCHER_NOT_ALLOWED');
    expect(err.httpStatus).toBe(400);
    expect(err.details).toEqual({ lineIndexes: [1, 2] });
  });

  it('creates validation error', () => {
    const err = Errors.validation('השדה חובה', 'phone');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.httpStatus).toBe(400);
    expect(err.message).toBe('השדה חובה');
    expect(err.details).toEqual({ field: 'phone' });
  });

  it('creates error by code with Errors.of', () => {
    const err = Errors.of('SERVICE_UNAVAILABLE');
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.httpStatus).toBe(503);
    expect(err.message).toBe('השירות אינו זמין כרגע');
  });
});
