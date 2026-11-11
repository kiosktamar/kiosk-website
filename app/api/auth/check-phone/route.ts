import { route, json, parseBody } from '@/lib/http';
import { checkPhoneSchema } from '@/lib/validation';
import { services } from '@/lib/services';

export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const body = await parseBody(req, checkPhoneSchema);
  const result = await services.auth.checkPhone(body.phone);
  return json(result);
});
