import { route, json, parseBody } from '@/lib/http';
import { changePasswordSchema } from '@/lib/validation';
import { requireUser } from '@/lib/auth/guards';
import { services } from '@/lib/services';
import { signSession, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, changePasswordSchema);
  const newSession = await services.auth.changePassword(user.id, body.currentPassword, body.newPassword);
  const token = await signSession(newSession);
  const res = json({ ok: true });
  setSessionCookie(res, token, newSession.role);
  return res;
});
