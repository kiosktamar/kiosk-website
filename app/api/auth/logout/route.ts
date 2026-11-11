import { route, json } from '@/lib/http';
import { clearSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const POST = route(async (_req) => {
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
