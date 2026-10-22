// lib/errors/errors.ts — factory functions for errors with dynamic messages.
// Isomorphic: runs in browser and server.

import type { ServerErrorCode } from '@/lib/contracts/errors';
import { IsraelTime } from '@/lib/domain/IsraelTime';
import { AppError } from './AppError';

export class Errors {
  static invalidCredentials(remainingAttempts?: number): AppError {
    if (remainingAttempts !== undefined) {
      return new AppError('INVALID_CREDENTIALS', {
        message: `סיסמה שגויה. נותרו ${remainingAttempts} ניסיונות לפני נעילת החשבון`,
        details: { remainingAttempts },
      });
    }
    return new AppError('INVALID_CREDENTIALS');
  }

  static accountLocked(lockedUntil: Date): AppError {
    const timeStr = IsraelTime.formatTime(lockedUntil);
    return new AppError('ACCOUNT_LOCKED', {
      message: `יותר מדי ניסיונות. החשבון ננעל עד ${timeStr}`,
      details: { lockedUntil: lockedUntil.toISOString() },
    });
  }

  static itemUnavailable(name: string, productIds: number[], lineIndexes: number[]): AppError {
    return new AppError('ITEM_UNAVAILABLE', {
      message: `"${name}" אזל מהמלאי`,
      details: { productIds, lineIndexes },
    });
  }

  static tooManyOpenOrders(max: number): AppError {
    return new AppError('TOO_MANY_OPEN_ORDERS', {
      message: `יש לך כבר ${max} הזמנות פתוחות. אפשר להזמין שוב אחרי שאחת תיאסף`,
      details: { max },
    });
  }

  static voucherNotAllowed(lineIndexes?: number[]): AppError {
    return new AppError('VOUCHER_NOT_ALLOWED', {
      details: lineIndexes ? { lineIndexes } : undefined,
    });
  }

  static validation(message?: string, field?: string): AppError {
    return new AppError('VALIDATION_ERROR', {
      message,
      details: field ? { field } : undefined,
    });
  }

  static of(code: ServerErrorCode): AppError {
    return new AppError(code);
  }
}
