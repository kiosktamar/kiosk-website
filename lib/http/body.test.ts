import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody, parseQuery, parseIdParam } from './body';
import { AppError } from '@/lib/errors/AppError';

describe('body and query parsing utilities', () => {
  const testSchema = z.strictObject({
    name: z.string().min(2, 'השם קצר מדי'),
    phone: z.string().superRefine((val, ctx) => {
      if (val !== '0501234567') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'מספר לא תקין',
          params: { appCode: 'INVALID_PHONE' },
        });
      }
    }),
  });

  describe('parseBody', () => {
    it('rejects missing or non-json Content-Type', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: 'דני', phone: '0501234567' }),
      });

      await expect(parseBody(req, testSchema)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
      });
    });

    it('rejects broken/invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ broken json ',
      });

      await expect(parseBody(req, testSchema)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
      });
    });

    it('rejects extra fields on strict schemas', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'דני', phone: '0501234567', extraField: 'bad' }),
      });

      await expect(parseBody(req, testSchema)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
      });
    });

    it('maps issue with custom appCode properly', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'דני', phone: '0500000000' }),
      });

      await expect(parseBody(req, testSchema)).rejects.toMatchObject({
        code: 'INVALID_PHONE',
        httpStatus: 400,
        details: { field: 'phone' },
      });
    });

    it('parses valid payload successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ name: 'דני', phone: '0501234567' }),
      });

      const data = await parseBody(req, testSchema);
      expect(data).toEqual({ name: 'דני', phone: '0501234567' });
    });
  });

  describe('parseQuery', () => {
    const querySchema = z.strictObject({
      id: z.string(),
    });

    it('parses query params successfully', () => {
      const req = new NextRequest('http://localhost:3000/api/test?id=123');
      const res = parseQuery(req, querySchema);
      expect(res).toEqual({ id: '123' });
    });

    it('throws validation error on invalid query params', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      expect(() => parseQuery(req, querySchema)).toThrow(AppError);
    });
  });

  describe('parseIdParam', () => {
    it('parses valid positive integer id', async () => {
      const id = await parseIdParam(Promise.resolve({ id: '12' }));
      expect(id).toBe(12);
    });

    it('throws 404 NOT_FOUND for invalid id values: "abc", "0", "-1", "1.5"', async () => {
      const invalids = ['abc', '0', '-1', '1.5', '', '01', '-10'];
      for (const val of invalids) {
        await expect(parseIdParam(Promise.resolve({ id: val }))).rejects.toMatchObject({
          code: 'NOT_FOUND',
          httpStatus: 404,
        });
      }
    });
  });
});
