// lib/domain/OrderPricing.ts — single source of truth for order line and total pricing.
// Isomorphic: runs in browser and server.

import type { PaymentMethod } from '@/lib/contracts/api';

export interface PricingLineInput {
  basePriceAgorot: number; // product price (SINGLE) or combo price (COMBO)
  extrasPerUnitAgorot: number; // sum of selected toppings' extra prices for ONE unit (incl. all combo components)
  quantity: number; // integer >= 1
  paymentMethod: PaymentMethod;
}

export interface PricingLineResult {
  lineTotalAgorot: number;
  cashAgorot: number;
  vouchers: number;
}

export interface PricingOrderResult {
  lines: PricingLineResult[];
  totalAgorot: number;
  cashDueAgorot: number;
  voucherCount: number;
}

export class OrderPricing {
  static priceLine(line: PricingLineInput): PricingLineResult {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new RangeError(`Line quantity must be an integer >= 1, received: ${line.quantity}`);
    }
    if (!Number.isInteger(line.basePriceAgorot) || line.basePriceAgorot < 0) {
      throw new RangeError(`basePriceAgorot must be an integer >= 0, received: ${line.basePriceAgorot}`);
    }
    if (!Number.isInteger(line.extrasPerUnitAgorot) || line.extrasPerUnitAgorot < 0) {
      throw new RangeError(
        `extrasPerUnitAgorot must be an integer >= 0, received: ${line.extrasPerUnitAgorot}`,
      );
    }

    const unitTotal = line.basePriceAgorot + line.extrasPerUnitAgorot;
    const lineTotalAgorot = unitTotal * line.quantity;

    if (line.paymentMethod === 'VOUCHER') {
      return {
        lineTotalAgorot,
        cashAgorot: line.extrasPerUnitAgorot * line.quantity,
        vouchers: line.quantity,
      };
    }

    return {
      lineTotalAgorot,
      cashAgorot: lineTotalAgorot,
      vouchers: 0,
    };
  }

  static priceOrder(lines: PricingLineInput[]): PricingOrderResult {
    const pricedLines = lines.map((l) => OrderPricing.priceLine(l));
    let totalAgorot = 0;
    let cashDueAgorot = 0;
    let voucherCount = 0;

    for (const line of pricedLines) {
      totalAgorot += line.lineTotalAgorot;
      cashDueAgorot += line.cashAgorot;
      voucherCount += line.vouchers;
    }

    return {
      lines: pricedLines,
      totalAgorot,
      cashDueAgorot,
      voucherCount,
    };
  }
}
