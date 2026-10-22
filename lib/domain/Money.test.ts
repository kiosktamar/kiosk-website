import { describe, it, expect } from 'vitest';
import { Money } from './Money';

describe('Money', () => {
  it('formats agorot correctly as specified in doc 02 section 5', () => {
    expect(Money.format(1250)).toBe('₪12.50');
    expect(Money.format(1200)).toBe('₪12');
    expect(Money.format(5)).toBe('₪0.05');
    expect(Money.format(0)).toBe('₪0');

    const m = new Money(1250);
    expect(m.format()).toBe('₪12.50');
  });

  it('adds and multiplies money objects', () => {
    const m1 = new Money(100);
    const m2 = new Money(250);
    expect(m1.add(m2).agorot).toBe(350);
    expect(m1.multiply(3).agorot).toBe(300);
  });

  it('throws RangeError on negative or non-integer values', () => {
    expect(() => new Money(-1)).toThrow(RangeError);
    expect(() => new Money(12.5)).toThrow(RangeError);
    expect(() => Money.format(-100)).toThrow(RangeError);
    expect(() => new Money(100).multiply(-2)).toThrow(RangeError);
    expect(() => Money.sum([100, -50])).toThrow(RangeError);
  });

  it('parses shekel input accurately', () => {
    expect(Money.parseShekelInput('12.5')).toBe(1250);
    expect(Money.parseShekelInput('12.50')).toBe(1250);
    expect(Money.parseShekelInput('12')).toBe(1200);
    expect(Money.parseShekelInput('0.05')).toBe(5);
    expect(Money.parseShekelInput('0')).toBe(0);

    expect(Money.parseShekelInput('12.555')).toBeNull();
    expect(Money.parseShekelInput('-12')).toBeNull();
    expect(Money.parseShekelInput('abc')).toBeNull();
    expect(Money.parseShekelInput('')).toBeNull();
    expect(Money.parseShekelInput(null as unknown as string)).toBeNull();
  });

  it('formats paymentSummary for all 5 cases', () => {
    // 1. vouchers > 0 and cash > 0, with cashSuffix
    expect(Money.paymentSummary(2, 1400, { cashSuffix: true })).toBe('2 שוברים + ₪14 במזומן');
    // 2. single voucher + cash without cashSuffix
    expect(Money.paymentSummary(1, 800, { cashSuffix: false })).toBe('1 שובר + ₪8');
    // 3. no vouchers, cash only with cashSuffix
    expect(Money.paymentSummary(0, 1400, { cashSuffix: true })).toBe('₪14 במזומן');
    // 4. vouchers only
    expect(Money.paymentSummary(3, 0, { cashSuffix: true })).toBe('3 שוברים');
    expect(Money.paymentSummary(1, 0, { cashSuffix: true })).toBe('1 שובר');
    // 5. zero amount
    expect(Money.paymentSummary(0, 0, { cashSuffix: true })).toBe('₪0');
    expect(Money.paymentSummary(0, 0, { cashSuffix: false })).toBe('₪0');
  });
});
