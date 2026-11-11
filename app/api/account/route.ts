import { route, json, parseBody } from '@/lib/http';
import type { MeResponse } from '@/lib/contracts/api';
import { updateAccountSchema } from '@/lib/validation';
import { requireUser } from '@/lib/auth/guards';
import { services } from '@/lib/services';

export const dynamic = 'force-dynamic';

export const PATCH = route(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, updateAccountSchema);
  const updated = await services.users.updateName(user.id, body.fullName);
  return json<MeResponse>({ user: updated });
});
