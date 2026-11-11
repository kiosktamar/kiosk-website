import { route, json, parseQuery } from '@/lib/http';
import type { AdminUserSearchResponse } from '@/lib/contracts/api';
import { userSearchQuerySchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth/guards';
import { services } from '@/lib/services';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  await requireAdmin(req);
  const query = parseQuery(req, userSearchQuerySchema);
  const user = await services.users.findStudentByPhone(query.phone);
  return json<AdminUserSearchResponse>({ user });
});
