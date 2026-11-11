import { route, json, parseIdParam, parseBody, type RouteContext } from '@/lib/http';
import type { AdminUserSearchResponse } from '@/lib/contracts/api';
import { updateUserSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/guards';
import { services } from '@/lib/services';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(async (req, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const id = await parseIdParam(ctx.params);
  const body = await parseBody(req, updateUserSchema);
  const user = await services.users.setActive(id, body.isActive);
  return json<AdminUserSearchResponse>({ user });
});
