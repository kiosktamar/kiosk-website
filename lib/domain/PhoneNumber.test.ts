import { describe, it, expect } from 'vitest';
import { PhoneNumber } from './PhoneNumber';

describe('PhoneNumber', () => {
  it('normalizes valid Israeli mobile numbers with various delimiters', () => {
    const inputs = [
      '054-123 4567',
      '+972541234567',
      '972541234567',
      '(054) 123-4567',
      '054.123.4567',
      '0541234567',
    ];

    for (const input of inputs) {
      const parsed = PhoneNumber.tryParse(input);
      expect(parsed).not.toBeNull();
      expect(parsed?.value).toBe('0541234567');
      expect(PhoneNumber.isValid(input)).toBe(true);
    }
  });

  it('rejects invalid numbers', () => {
    const invalidInputs = [
      '03-1234567', // landline prefix 03
      '054123456', // only 9 digits
      '05412345678', // 11 digits
      '',
      'abc',
      '050',
      '+97231234567',
      null as unknown as string,
    ];

    for (const input of invalidInputs) {
      expect(PhoneNumber.tryParse(input)).toBeNull();
      expect(PhoneNumber.isValid(input)).toBe(false);
    }
  });

  it('formats correctly as 05X-XXX-XXXX', () => {
    const phone = PhoneNumber.tryParse('+972-54-123-4567')!;
    expect(phone.format()).toBe('054-123-4567');
    expect(phone.toString()).toBe('0541234567');
  });

  it('counts digits correctly after normalization', () => {
    expect(PhoneNumber.digitCount('054-123 4567')).toBe(10);
    expect(PhoneNumber.digitCount('+972541234567')).toBe(10);
    expect(PhoneNumber.digitCount('972541234567')).toBe(10);
    expect(PhoneNumber.digitCount('054')).toBe(3);
    expect(PhoneNumber.digitCount('')).toBe(0);
  });
});
