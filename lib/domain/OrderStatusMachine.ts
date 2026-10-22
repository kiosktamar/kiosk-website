// lib/domain/OrderStatusMachine.ts — state machine for order lifecycle transitions.
// Isomorphic: runs in browser and server.

import type { OrderStatus } from '@/lib/contracts/api';

export class OrderStatusMachine {
  static readonly TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
    PENDING: ['READY', 'CANCELED'],
    READY: ['PAID', 'CANCELED'],
    PAID: [],
    CANCELED: [],
  };

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const allowed = OrderStatusMachine.TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static isOpen(status: OrderStatus): boolean {
    return status === 'PENDING' || status === 'READY';
  }

  static isFinal(status: OrderStatus): boolean {
    return status === 'PAID' || status === 'CANCELED';
  }

  static requiredCurrent(to: 'READY' | 'PAID' | 'CANCELED'): OrderStatus[] {
    switch (to) {
      case 'READY':
        return ['PENDING'];
      case 'PAID':
        return ['READY'];
      case 'CANCELED':
        return ['PENDING', 'READY'];
    }
  }
}
