import { describe, it, expect } from 'vitest';
import { AppError } from './AppError';
import { SERVER_ERRORS } from '@/lib/contracts/errors';

describe('AppError', () => {
  it('derives HTTP status directly from SERVER_ERRORS catalog', () => {
    const notFound = new AppError('NOT_FOUND');
    expect(notFound.httpStatus).toBe(404);
    expect(notFound.message).toBe(SERVER_ERRORS.NOT_FOUND.message);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.details).toBeUndefined();

    const badOrigin = new AppError('BAD_ORIGIN');
    expect(badOrigin.httpStatus).toBe(403);
    expect(badOrigin.message).toBe(SERVER_ERRORS.BAD_ORIGIN.message);

    const internal = new AppError('INTERNAL');
    expect(internal.httpStatus).toBe(500);

    const locked = new AppError('ACCOUNT_LOCKED');
    expect(locked.httpStatus).toBe(423);
  });

  it('supports custom message and details', () => {
    const err = new AppError('VALIDATION_ERROR', {
      message: 'השדה אינו תקין',
      details: { field: 'phone' },
    });
    expect(err.httpStatus).toBe(400);
    expect(err.message).toBe('השדה אינו תקין');
    expect(err.details).toEqual({ field: 'phone' });
  });
});
