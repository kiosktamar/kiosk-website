import { describe, it, expect } from 'vitest';
import { OrderCode } from './OrderCode';
import { ORDER_CODE_ALPHABET } from '@/lib/contracts/limits';

describe('OrderCode', () => {
  it('generates 4-character codes strictly within ORDER_CODE_ALPHABET in 10,000 runs', () => {
    const forbiddenChars = ['0', '1', 'o', 'l', 'i', 'O', 'I', 'L'];
    for (let i = 0; i < 10000; i++) {
      const code = OrderCode.generate();
      expect(code.length).toBe(4);
      for (const char of code) {
        expect(ORDER_CODE_ALPHABET).toContain(char);
        expect(forbiddenChars).not.toContain(char);
      }
      expect(OrderCode.isValid(code)).toBe(true);
    }
  });

  it('uses injected random function predictably', () => {
    // alphabet has 31 chars: index 0 is '2', index 1 is '3', index 2 is '4', index 3 is '5'
    let counter = 0;
    const mockRandom = (maxExclusive: number) => {
      expect(maxExclusive).toBe(ORDER_CODE_ALPHABET.length);
      return counter++ % maxExclusive;
    };
    const code = OrderCode.generate(mockRandom);
    expect(code).toBe('2345');
  });

  it('validates codes with isValid', () => {
    expect(OrderCode.isValid('2345')).toBe(true);
    expect(OrderCode.isValid('abcd')).toBe(true);
    expect(OrderCode.isValid('234')).toBe(false); // too short
    expect(OrderCode.isValid('23456')).toBe(false); // too long
    expect(OrderCode.isValid('2340')).toBe(false); // contains '0'
    expect(OrderCode.isValid('2341')).toBe(false); // contains '1'
    expect(OrderCode.isValid('234o')).toBe(false); // contains 'o'
    expect(OrderCode.isValid('234l')).toBe(false); // contains 'l'
    expect(OrderCode.isValid('234i')).toBe(false); // contains 'i'
    expect(OrderCode.isValid('')).toBe(false);
    expect(OrderCode.isValid(null as unknown as string)).toBe(false);
  });
});
