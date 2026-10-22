// lib/errors/AppError.ts — unified domain error class.
// Isomorphic: runs in browser and server.

import { SERVER_ERRORS, type ServerErrorCode } from '@/lib/contracts/errors';

export class AppError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(
    public readonly code: ServerErrorCode,
    opts?: { message?: string; details?: Record<string, unknown> },
  ) {
    const errorDef = SERVER_ERRORS[code];
    const defaultMsg = errorDef ? errorDef.message : 'שגיאת שרת';
    super(opts?.message ?? defaultMsg);
    this.name = 'AppError';
    this.details = opts?.details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  get httpStatus(): number {
    return SERVER_ERRORS[this.code]?.status ?? 500;
  }
}
