import { callRoute } from './request';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';

export async function createStudent(opts?: {
  phone?: string;
  fullName?: string;
  password?: string;
}): Promise<{ id: number; phone: string; password: string; cookie: string }> {
  const phone = opts?.phone ?? `054${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`;
  const fullName = opts?.fullName ?? 'תלמיד בדיקה';
  const password = opts?.password ?? 'pass1234';

  const res = await callRoute(registerRoute, {
    method: 'POST',
    url: '/api/auth/register',
    body: { phone, fullName, password, passwordConfirm: password },
  });

  if (res.status !== 201) throw new Error(`createStudent failed: ${res.status} ${JSON.stringify(res.json)}`);

  return { id: res.json.user.id, phone: res.json.user.phone, password, cookie: res.setCookie! };
}

export async function loginAs(phone: string, password: string): Promise<string> {
  const res = await callRoute(loginRoute, {
    method: 'POST',
    url: '/api/auth/login',
    body: { phone, password },
  });
  if (res.status !== 200) throw new Error(`loginAs failed: ${res.status}`);
  return res.setCookie!;
}

export async function adminCookie(): Promise<string> {
  const phone = process.env.ADMIN_PHONE!;
  const password = process.env.ADMIN_PASSWORD!;
  return loginAs(phone, password);
}
