import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { route, json } from './route';
import { AppError } from '@/lib/errors/AppError';

describe('route() wrapper', () => {
  const dummyCtx = { params: Promise.resolve({}) };

  it('rejects POST without Origin header with 403 BAD_ORIGIN', async () => {
    const handler = route(async () => json({ success: true }));
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_ORIGIN');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects POST with foreign Origin header with 403 BAD_ORIGIN', async () => {
    const handler = route(async () => json({ success: true }));
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        origin: 'http://malicious-site.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_ORIGIN');
  });

  it('allows POST when Origin matches req.nextUrl.origin', async () => {
    const handler = route(async () => json({ created: true }, 201));
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ created: true });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('allows GET requests without Origin header', async () => {
    const handler = route(async () => json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('transforms thrown AppError into standard JSON error response', async () => {
    const handler = route(async () => {
      throw new AppError('ITEM_UNAVAILABLE', {
        message: '"פיצה" אזל מהמלאי',
        details: { productIds: [1] },
      });
    });

    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'ITEM_UNAVAILABLE',
        message: '"פיצה" אזל מהמלאי',
        details: { productIds: [1] },
      },
    });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('catches generic errors and returns 500 INTERNAL without exposing internal details', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler = route(async () => {
      throw new Error('Database password is sensitive_secret');
    });

    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const res = await handler(req, dummyCtx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'משהו השתבש. נסה שוב',
      },
    });
    expect(JSON.stringify(body)).not.toContain('sensitive_secret');
    expect(consoleSpy).toHaveBeenCalledWith('[api]', 'GET', '/api/test', 'Error');

    consoleSpy.mockRestore();
  });
});
