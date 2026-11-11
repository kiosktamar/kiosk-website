import { route, json, parseIdParam, type RouteContext } from '@/lib/http';
import { requireAdmin } from '@/lib/auth/guards';
import { services } from '@/lib/services';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string }>(async (req, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const id = await parseIdParam(ctx.params);
  await services.users.resetPassword(id);
  return json({ ok: true });
});
