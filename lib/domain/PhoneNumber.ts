// lib/domain/PhoneNumber.ts — pure domain class for phone normalization and formatting.
// Isomorphic: runs in browser and server.

import { PHONE_REGEX } from '@/lib/contracts/limits';

export class PhoneNumber {
  private constructor(public readonly value: string) {}

  private static normalize(input: string): string {
    let cleaned = input.replace(/[\s\-\.\(\)]/g, '');
    if (cleaned.startsWith('+972')) {
      cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('972')) {
      cleaned = '0' + cleaned.slice(3);
    }
    return cleaned;
  }

  static tryParse(input: string): PhoneNumber | null {
    if (typeof input !== 'string') {
      return null;
    }
    const normalized = PhoneNumber.normalize(input);
    if (!PHONE_REGEX.test(normalized)) {
      return null;
    }
    return new PhoneNumber(normalized);
  }

  static isValid(input: string): boolean {
    return PhoneNumber.tryParse(input) !== null;
  }

  static digitCount(input: string): number {
    if (typeof input !== 'string') {
      return 0;
    }
    const normalized = PhoneNumber.normalize(input);
    const digits = normalized.match(/\d/g);
    return digits ? digits.length : 0;
  }

  format(): string {
    // value is always 10 digits '05XXXXXXXX'
    return `${this.value.slice(0, 3)}-${this.value.slice(3, 6)}-${this.value.slice(6)}`;
  }

  toString(): string {
    return this.value;
  }
}
