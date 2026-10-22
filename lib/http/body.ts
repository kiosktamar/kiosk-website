// lib/http/body.ts — request parsing and validation utilities.

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors/AppError';
import { Errors } from '@/lib/errors/errors';
import type { ServerErrorCode } from '@/lib/contracts/errors';

function mapZodIssueToError(issue: z.ZodIssue): AppError {
  const params = (issue as { params?: { appCode?: ServerErrorCode } }).params;
  const appCode = params?.appCode;
  const field = issue.path.length > 0 ? issue.path.join('.') : undefined;

  if (appCode) {
    return new AppError(appCode, {
      message: issue.message,
      details: field ? { field } : undefined,
    });
  }

  return Errors.validation(issue.message, field);
}

export async function parseBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw Errors.validation('הנתונים שנשלחו אינם תקינים');
  }

  let rawJson: unknown;
  try {
    rawJson = await req.json();
  } catch {
    throw Errors.validation('הנתונים שנשלחו אינם תקינים');
  }

  const result = schema.safeParse(rawJson);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw mapZodIssueToError(firstIssue);
  }

  return result.data;
}

export function parseQuery<S extends z.ZodType>(req: NextRequest, schema: S): z.output<S> {
  const queryObj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const result = schema.safeParse(queryObj);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw mapZodIssueToError(firstIssue);
  }

  return result.data;
}

export async function parseIdParam(params: Promise<{ id: string }>): Promise<number> {
  const resolved = await params;
  const idStr = resolved?.id;

  if (typeof idStr !== 'string' || !/^[1-9]\d*$/.test(idStr)) {
    throw new AppError('NOT_FOUND');
  }

  const num = Number(idStr);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw new AppError('NOT_FOUND');
  }

  return num;
}
