// lib/domain/Money.ts — pure domain class for currency calculations and formatting.
// Isomorphic: runs in browser and server.

export class Money {
  constructor(public readonly agorot: number) {
    if (!Number.isInteger(agorot) || agorot < 0) {
      throw new RangeError(`Agorot must be a non-negative integer, received: ${agorot}`);
    }
  }

  add(other: Money): Money {
    return new Money(this.agorot + other.agorot);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new RangeError(`Factor must be a non-negative integer, received: ${factor}`);
    }
    return new Money(this.agorot * factor);
  }

  format(): string {
    return Money.format(this.agorot);
  }

  static format(agorot: number): string {
    if (!Number.isInteger(agorot) || agorot < 0) {
      throw new RangeError(`Agorot must be a non-negative integer, received: ${agorot}`);
    }
    if (agorot % 100 === 0) {
      return `₪${agorot / 100}`;
    }
    return `₪${(agorot / 100).toFixed(2)}`;
  }

  static sum(values: number[]): number {
    return values.reduce((acc, curr) => {
      if (!Number.isInteger(curr) || curr < 0) {
        throw new RangeError(`Value must be a non-negative integer, received: ${curr}`);
      }
      return acc + curr;
    }, 0);
  }

  static parseShekelInput(input: string): number | null {
    if (typeof input !== 'string') {
      return null;
    }
    const trimmed = input.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return null;
    }
    const [wholeStr, decStr = ''] = trimmed.split('.');
    const whole = parseInt(wholeStr, 10);
    const dec = parseInt((decStr + '00').slice(0, 2), 10);
    const agorot = whole * 100 + dec;
    if (!Number.isInteger(agorot) || agorot < 0) {
      return null;
    }
    return agorot;
  }

  static paymentSummary(
    voucherCount: number,
    cashAgorot: number,
    opts: { cashSuffix: boolean },
  ): string {
    if (!Number.isInteger(voucherCount) || voucherCount < 0) {
      throw new RangeError(`voucherCount must be a non-negative integer, received: ${voucherCount}`);
    }
    if (!Number.isInteger(cashAgorot) || cashAgorot < 0) {
      throw new RangeError(`cashAgorot must be a non-negative integer, received: ${cashAgorot}`);
    }

    if (voucherCount === 0 && cashAgorot === 0) {
      return '₪0';
    }

    if (voucherCount > 0 && cashAgorot === 0) {
      return voucherCount === 1 ? '1 שובר' : `${voucherCount} שוברים`;
    }

    const cashFormatted = Money.format(cashAgorot);
    const cashText = opts.cashSuffix ? `${cashFormatted} במזומן` : cashFormatted;

    if (voucherCount === 0 && cashAgorot > 0) {
      return cashText;
    }

    const voucherText = voucherCount === 1 ? '1 שובר' : `${voucherCount} שוברים`;
    return `${voucherText} + ${cashText}`;
  }
}
