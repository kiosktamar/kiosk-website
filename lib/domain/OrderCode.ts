// lib/domain/OrderCode.ts — order code generation and validation using unbiased crypto random.
// Isomorphic: runs in browser and server.

import { ORDER_CODE_ALPHABET, ORDER_CODE_LENGTH } from '@/lib/contracts/limits';

export class OrderCode {
  private static defaultRandom(maxExclusive: number): number {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    let r: number;
    do {
      globalThis.crypto.getRandomValues(buf);
      r = buf[0];
    } while (r >= limit);
    return r % maxExclusive;
  }

  static generate(random?: (maxExclusive: number) => number): string {
    const rnd = random ?? OrderCode.defaultRandom;
    const alphabet = ORDER_CODE_ALPHABET;
    let code = '';
    for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
      const idx = rnd(alphabet.length);
      code += alphabet[idx];
    }
    return code;
  }

  static isValid(code: string): boolean {
    if (typeof code !== 'string' || code.length !== ORDER_CODE_LENGTH) {
      return false;
    }
    for (let i = 0; i < code.length; i++) {
      if (!ORDER_CODE_ALPHABET.includes(code[i])) {
        return false;
      }
    }
    return true;
  }
}
