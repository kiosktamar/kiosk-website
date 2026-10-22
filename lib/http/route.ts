// lib/http/route.ts — central route handler wrapper and response utilities.

import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors/AppError';
import type { ApiErrorBody } from '@/lib/contracts/errors';

export type RouteContext<P = Record<string, string>> = { params: Promise<P> };

export function errorResponse(err: AppError): NextResponse {
  const body: ApiErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };
  return NextResponse.json(body, {
    status: err.httpStatus,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

const MUTATIVE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function route<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
): (req: NextRequest, ctx: RouteContext<P>) => Promise<Response> {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    // 1. Origin header check for mutative methods
    if (MUTATIVE_METHODS.has(req.method.toUpperCase())) {
      const origin = req.headers.get('origin');
      const expectedOrigin = req.nextUrl.origin;
      if (!origin || origin !== expectedOrigin) {
        return errorResponse(new AppError('BAD_ORIGIN'));
      }
    }

    // 2. Execute handler in try/catch
    try {
      const response = await handler(req, ctx);
      // Ensure Cache-Control: no-store
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error);
      }

      // Log safe message without secrets, body or DB details
      const errName = error instanceof Error ? error.name : 'UnknownError';
      console.error('[api]', req.method, req.nextUrl.pathname, errName);

      return errorResponse(new AppError('INTERNAL'));
    }
  };
}
