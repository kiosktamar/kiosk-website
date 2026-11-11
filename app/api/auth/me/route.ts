import { route, json } from '@/lib/http';
import type { MeResponse } from '@/lib/contracts/api';
import { signSession, setSessionCookie, shouldRenew } from '@/lib/auth/session';
import { requireUserWithClaims } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const { user, claims } = await requireUserWithClaims(req);
  const res = json<MeResponse>({ user });
  if (shouldRenew(claims, new Date())) {
    const newToken = await signSession({ userId: user.id, role: user.role, tokenVersion: claims.tokenVersion });
    setSessionCookie(res, newToken, user.role);
  }
  return res;
});
