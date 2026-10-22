import { describe, it, expect } from 'vitest';
import { OrderPricing, type PricingLineInput } from './OrderPricing';

describe('OrderPricing', () => {
  it('prices a cash line correctly', () => {
    const line: PricingLineInput = {
      basePriceAgorot: 1200,
      extrasPerUnitAgorot: 300,
      quantity: 2,
      paymentMethod: 'CASH',
    };
    const result = OrderPricing.priceLine(line);
    expect(result).toEqual({
      lineTotalAgorot: 3000,
      cashAgorot: 3000,
      vouchers: 0,
    });
  });

  it('prices a voucher line with paid extras (from doc 02 section 5 example)', () => {
    // 2 burgers on voucher with fried onions (extras = 200 each, base = 2500)
    // total = (2500+200)*2 = 5400, cash = 200*2 = 400, vouchers = 2
    const line: PricingLineInput = {
      basePriceAgorot: 2500,
      extrasPerUnitAgorot: 200,
      quantity: 2,
      paymentMethod: 'VOUCHER',
    };
    const result = OrderPricing.priceLine(line);
    expect(result).toEqual({
      lineTotalAgorot: 5400,
      cashAgorot: 400,
      vouchers: 2,
    });
  });

  it('prices a combo line with component extras (always cash)', () => {
    const comboLine: PricingLineInput = {
      basePriceAgorot: 3500, // combo base price
      extrasPerUnitAgorot: 400, // extras across combo components
      quantity: 1,
      paymentMethod: 'CASH',
    };
    const result = OrderPricing.priceLine(comboLine);
    expect(result).toEqual({
      lineTotalAgorot: 3900,
      cashAgorot: 3900,
      vouchers: 0,
    });
  });

  it('prices a full order with mixed lines', () => {
    const lines: PricingLineInput[] = [
      {
        basePriceAgorot: 2500,
        extrasPerUnitAgorot: 200,
        quantity: 2,
        paymentMethod: 'VOUCHER',
      },
      {
        basePriceAgorot: 1000,
        extrasPerUnitAgorot: 0,
        quantity: 1,
        paymentMethod: 'CASH',
      },
    ];

    const orderResult = OrderPricing.priceOrder(lines);
    expect(orderResult.lines).toHaveLength(2);
    expect(orderResult.totalAgorot).toBe(5400 + 1000);
    expect(orderResult.cashDueAgorot).toBe(400 + 1000);
    expect(orderResult.voucherCount).toBe(2);
  });

  it('throws on invalid input values', () => {
    expect(() =>
      OrderPricing.priceLine({
        basePriceAgorot: -1,
        extrasPerUnitAgorot: 0,
        quantity: 1,
        paymentMethod: 'CASH',
      }),
    ).toThrow(RangeError);

    expect(() =>
      OrderPricing.priceLine({
        basePriceAgorot: 100,
        extrasPerUnitAgorot: 0,
        quantity: 0,
        paymentMethod: 'CASH',
      }),
    ).toThrow(RangeError);
  });
});
