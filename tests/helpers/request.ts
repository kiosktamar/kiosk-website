// tests/helpers/request.ts — test helper for invoking route handlers directly.

import { NextRequest } from 'next/server';

export interface CallOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string; // path, e.g. '/api/orders'; base is http://localhost:3000
  body?: unknown; // JSON-encoded with Content-Type: application/json
  cookie?: string; // value of kt_session
  params?: Record<string, string>;
  origin?: string | null; // default: 'http://localhost:3000'; null = omit header
  headers?: Record<string, string>;
}

export interface CallResult {
  status: number;
  json: any;
  setCookie: string | null;
  headers: Headers;
}

export async function callRoute(
  handler: (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>,
  opts: CallOptions,
): Promise<CallResult> {
  const fullUrl = opts.url.startsWith('http')
    ? opts.url
    : new URL(opts.url, 'http://localhost:3000').toString();

  const headers = new Headers(opts.headers);

  if (opts.origin !== null) {
    headers.set('origin', opts.origin ?? 'http://localhost:3000');
  }

  if (opts.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (opts.cookie) {
    headers.set('cookie', `kt_session=${opts.cookie}`);
  }

  const reqBody = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

  const req = new NextRequest(fullUrl, {
    method: opts.method,
    headers,
    body: reqBody,
  });

  const ctx = { params: Promise.resolve(opts.params ?? {}) };
  const res = await handler(req, ctx);

  let json: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      // not a valid json or empty body
    }
  }

  // Extract kt_session from set-cookie
  let setCookie: string | null = null;
  const rawSetCookie = res.headers.get('set-cookie');
  if (rawSetCookie) {
    const match = rawSetCookie.match(/kt_session=([^;]+)/);
    if (match) {
      setCookie = match[1];
    }
  }

  return {
    status: res.status,
    json,
    setCookie,
    headers: res.headers,
  };
}
