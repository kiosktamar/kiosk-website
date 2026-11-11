import { route, json, parseBody } from '@/lib/http';
import { loginSchema } from '@/lib/validation';
import type { AuthResponse } from '@/lib/contracts/api';
import { services } from '@/lib/services';
import { signSession, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const body = await parseBody(req, loginSchema);
  const result = await services.auth.login(body);
  const token = await signSession(result.session);
  const res = json<AuthResponse>({ user: result.user, isDefaultPassword: result.isDefaultPassword });
  setSessionCookie(res, token, result.session.role);
  return res;
});
