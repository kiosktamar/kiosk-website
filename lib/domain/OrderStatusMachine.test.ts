import { describe, it, expect } from 'vitest';
import { OrderStatusMachine } from './OrderStatusMachine';
import type { OrderStatus } from '@/lib/contracts/api';

describe('OrderStatusMachine', () => {
  const statuses: OrderStatus[] = ['PENDING', 'READY', 'PAID', 'CANCELED'];

  it('tests all 16 transition combinations', () => {
    const allowedTransitions: [OrderStatus, OrderStatus][] = [
      ['PENDING', 'READY'],
      ['PENDING', 'CANCELED'],
      ['READY', 'PAID'],
      ['READY', 'CANCELED'],
    ];

    for (const from of statuses) {
      for (const to of statuses) {
        const isAllowed = allowedTransitions.some(([f, t]) => f === from && t === to);
        expect(OrderStatusMachine.canTransition(from, to)).toBe(isAllowed);
      }
    }
  });

  it('identifies open and final statuses', () => {
    expect(OrderStatusMachine.isOpen('PENDING')).toBe(true);
    expect(OrderStatusMachine.isOpen('READY')).toBe(true);
    expect(OrderStatusMachine.isOpen('PAID')).toBe(false);
    expect(OrderStatusMachine.isOpen('CANCELED')).toBe(false);

    expect(OrderStatusMachine.isFinal('PENDING')).toBe(false);
    expect(OrderStatusMachine.isFinal('READY')).toBe(false);
    expect(OrderStatusMachine.isFinal('PAID')).toBe(true);
    expect(OrderStatusMachine.isFinal('CANCELED')).toBe(true);
  });

  it('returns requiredCurrent statuses for conditional atomic updates', () => {
    expect(OrderStatusMachine.requiredCurrent('READY')).toEqual(['PENDING']);
    expect(OrderStatusMachine.requiredCurrent('PAID')).toEqual(['READY']);
    expect(OrderStatusMachine.requiredCurrent('CANCELED')).toEqual(['PENDING', 'READY']);
  });
});
