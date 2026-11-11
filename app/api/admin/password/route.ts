import { route, json, parseBody } from '@/lib/http';
import { changeAdminPasswordSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/guards';
import { services } from '@/lib/services';
import { signSession, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const body = await parseBody(req, changeAdminPasswordSchema);
  const newSession = await services.auth.changePassword(admin.id, body.currentPassword, body.newPassword);
  const token = await signSession(newSession);
  const res = json({ ok: true });
  setSessionCookie(res, token, newSession.role);
  return res;
});
