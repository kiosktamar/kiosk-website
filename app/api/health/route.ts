// app/api/health/route.ts — health check route using centralized route() wrapper.

import { route, json } from '@/lib/http';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch {
    throw new AppError('SERVICE_UNAVAILABLE');
  }
});
