import { describe, it, expect } from 'vitest';
import { callRoute } from '@/tests/helpers/request';
import { route, json } from './route';
import { AppError } from '@/lib/errors/AppError';

describe('callRoute test helper', () => {
  it('calls a GET route and parses JSON response', async () => {
    const handler = route(async () => json({ success: true, count: 42 }));
    const result = await callRoute(handler, {
      method: 'GET',
      url: '/api/test',
    });

    expect(result.status).toBe(200);
    expect(result.json).toEqual({ success: true, count: 42 });
    expect(result.headers.get('cache-control')).toBe('no-store');
  });

  it('passes cookies and extracts set-cookie for kt_session', async () => {
    const handler = route(async (req) => {
      const cookie = req.cookies.get('kt_session')?.value;
      const response = json({ cookieReceived: cookie });
      response.cookies.set('kt_session', 'new-token-999', { httpOnly: true });
      return response;
    });

    const result = await callRoute(handler, {
      method: 'POST',
      url: '/api/session-test',
      cookie: 'incoming-token-123',
    });

    expect(result.status).toBe(200);
    expect(result.json).toEqual({ cookieReceived: 'incoming-token-123' });
    expect(result.setCookie).toBe('new-token-999');
  });

  it('handles AppError responses with status and error JSON', async () => {
    const handler = route(async () => {
      throw new AppError('NOT_FOUND', { message: 'פריט לא נמצא' });
    });

    const result = await callRoute(handler, {
      method: 'GET',
      url: '/api/not-found',
    });

    expect(result.status).toBe(404);
    expect(result.json).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'פריט לא נמצא',
      },
    });
  });
});
