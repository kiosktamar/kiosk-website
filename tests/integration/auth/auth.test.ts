import { describe, it, expect, beforeEach } from 'vitest';
import { callRoute } from '@/tests/helpers/request';
import { resetDatabase, testPrisma } from '@/tests/helpers/db';
import { createStudent, loginAs, adminCookie } from '@/tests/helpers/auth';

import { POST as checkPhoneRoute } from '@/app/api/auth/check-phone/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as logoutRoute } from '@/app/api/auth/logout/route';
import { GET as meRoute } from '@/app/api/auth/me/route';
import { PATCH as accountRoute } from '@/app/api/account/route';
import { POST as changePasswordRoute } from '@/app/api/account/password/route';
import { GET as adminUsersRoute } from '@/app/api/admin/users/route';
import { POST as resetPasswordRoute } from '@/app/api/admin/users/[id]/reset-password/route';
import { PATCH as updateUserRoute } from '@/app/api/admin/users/[id]/route';
import { POST as adminPasswordRoute } from '@/app/api/admin/password/route';

import { signSession } from '@/lib/auth/session';
import { DEFAULT_RESET_PASSWORD } from '@/lib/contracts/limits';

describe('Run 03 — Authentication, Authorization, and User Management', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // ─── check-phone and registration ───────────────────────────────────────────

  describe('check-phone', () => {
    it('returns { exists: false } before registration and { exists: true } after', async () => {
      // Before registration - check with dash format
      const before = await callRoute(checkPhoneRoute, {
        method: 'POST',
        url: '/api/auth/check-phone',
        body: { phone: '054-123 4567' },
      });
      expect(before.status).toBe(200);
      expect(before.json.exists).toBe(false);

      // Register with E.164 format
      await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone: '+972541234567', fullName: 'תלמיד בדיקה', password: 'pass1234', passwordConfirm: 'pass1234' },
      });

      // After registration - check same number in dash format
      const after = await callRoute(checkPhoneRoute, {
        method: 'POST',
        url: '/api/auth/check-phone',
        body: { phone: '054-123 4567' },
      });
      expect(after.status).toBe(200);
      expect(after.json.exists).toBe(true);
    });

    it('returns 400 INVALID_PHONE for landline number 03-1234567', async () => {
      const res = await callRoute(checkPhoneRoute, {
        method: 'POST',
        url: '/api/auth/check-phone',
        body: { phone: '03-1234567' },
      });
      expect(res.status).toBe(400);
      expect(res.json.error.code).toBe('INVALID_PHONE');
    });
  });

  describe('registration', () => {
    it('registers a new student: 201, role=STUDENT, HttpOnly+SameSite=Lax cookie, isDefaultPassword=false', async () => {
      const phone = '0541234567';
      const res = await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone, fullName: 'תלמיד בדיקה', password: 'pass1234', passwordConfirm: 'pass1234' },
      });

      expect(res.status).toBe(201);
      expect(res.json.user.role).toBe('STUDENT');
      expect(res.json.isDefaultPassword).toBe(false);
      expect(res.setCookie).toBeTruthy();

      const rawSetCookie = res.headers.get('set-cookie') ?? '';
      expect(rawSetCookie.toLowerCase()).toContain('httponly');
      expect(rawSetCookie.toLowerCase()).toContain('samesite=lax');
    });

    it('returns 409 PHONE_ALREADY_REGISTERED on duplicate registration', async () => {
      const phone = '0541234568';
      await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone, fullName: 'ראשון', password: 'pass1234', passwordConfirm: 'pass1234' },
      });

      const res = await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone, fullName: 'שני', password: 'pass1234', passwordConfirm: 'pass1234' },
      });

      expect(res.status).toBe(409);
      expect(res.json.error.code).toBe('PHONE_ALREADY_REGISTERED');
    });

    it('returns 400 for name of 1 char, password of 5 chars, and extra field role:ADMIN', async () => {
      const res = await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone: '0541234569', fullName: 'א', password: 'short', passwordConfirm: 'short', role: 'ADMIN' },
      });
      expect(res.status).toBe(400);

      // Verify no user was created
      const count = await testPrisma.users.count({ where: { phone: '0541234569' } });
      expect(count).toBe(0);
    });

    it('returns 400 PASSWORD_MISMATCH when passwordConfirm differs', async () => {
      const res = await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: { phone: '0541234570', fullName: 'תלמיד', password: 'pass1234', passwordConfirm: 'different' },
      });
      expect(res.status).toBe(400);
      expect(res.json.error.code).toBe('PASSWORD_MISMATCH');
    });
  });

  // ─── Login and lockout ───────────────────────────────────────────────────────

  describe('login', () => {
    it('logs in with correct password: 200, cookie, isDefaultPassword based on input', async () => {
      await createStudent({ phone: '0541111111', password: 'pass1234' });

      // Login with normal password
      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone: '0541111111', password: 'pass1234' },
      });
      expect(res.status).toBe(200);
      expect(res.setCookie).toBeTruthy();
      expect(res.json.isDefaultPassword).toBe(false);

      // Register with default password and check isDefaultPassword
      await callRoute(registerRoute, {
        method: 'POST',
        url: '/api/auth/register',
        body: {
          phone: '0541111112',
          fullName: 'ברירת מחדל',
          password: DEFAULT_RESET_PASSWORD,
          passwordConfirm: DEFAULT_RESET_PASSWORD,
        },
      });
      const defaultRes = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone: '0541111112', password: DEFAULT_RESET_PASSWORD },
      });
      expect(defaultRes.json.isDefaultPassword).toBe(true);
    });

    it('tracks remaining attempts on wrong password: 401 with remainingAttempts 4,3,2,1', async () => {
      const { phone } = await createStudent({ phone: '0542222221' });

      for (let i = 4; i >= 1; i--) {
        const res = await callRoute(loginRoute, {
          method: 'POST',
          url: '/api/auth/login',
          body: { phone, password: 'wrongpassword' },
        });
        expect(res.status).toBe(401);
        expect(res.json.error.details.remainingAttempts).toBe(i);
      }
    });

    it('locks account on 5th wrong attempt and correct password returns 423; unlocks after lockout expires', async () => {
      const { phone } = await createStudent({ phone: '0542222222', password: 'pass1234' });

      // 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await callRoute(loginRoute, {
          method: 'POST',
          url: '/api/auth/login',
          body: { phone, password: 'wrongpassword' },
        });
      }

      // Even correct password returns 423
      const lockedRes = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password: 'pass1234' },
      });
      expect(lockedRes.status).toBe(423);
      expect(lockedRes.json.error.code).toBe('ACCOUNT_LOCKED');
      expect(lockedRes.json.error.details.lockedUntil).toBeTruthy();

      // Move locked_until to past to simulate lockout expiry
      const user = await testPrisma.users.findUniqueOrThrow({ where: { phone } });
      await testPrisma.users.update({
        where: { user_id: user.user_id },
        data: { locked_until: new Date(Date.now() - 1000) },
      });

      // Now correct password works
      const unlockRes = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password: 'pass1234' },
      });
      expect(unlockRes.status).toBe(200);
    });

    it('admin does not lock after 7 wrong attempts, then correct password succeeds', async () => {
      const phone = process.env.ADMIN_PHONE!;

      // 7 wrong attempts
      for (let i = 0; i < 7; i++) {
        const res = await callRoute(loginRoute, {
          method: 'POST',
          url: '/api/auth/login',
          body: { phone, password: 'wrongpassword' },
        });
        expect(res.status).toBe(401);
        // Admin should NOT have remainingAttempts
        expect(res.json.error.details?.remainingAttempts).toBeUndefined();
      }

      // Correct password succeeds
      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password: process.env.ADMIN_PASSWORD! },
      });
      expect(res.status).toBe(200);
    });

    it('blocked user with correct password gets 403 ACCOUNT_BLOCKED', async () => {
      const { phone, password } = await createStudent({ phone: '0542222223' });

      // Block the user
      const user = await testPrisma.users.findUniqueOrThrow({ where: { phone } });
      await testPrisma.users.update({
        where: { user_id: user.user_id },
        data: { is_active: false },
      });

      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password },
      });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe('ACCOUNT_BLOCKED');
    });
  });

  // ─── Cookie and token_version ─────────────────────────────────────────────

  describe('cookies and token_version', () => {
    it('request without cookie to /api/auth/me returns 401 UNAUTHENTICATED', async () => {
      const res = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(res.status).toBe(401);
      expect(res.json.error.code).toBe('UNAUTHENTICATED');
    });

    it('cookie with fake signature returns 401', async () => {
      const res = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: 'fakesignature.notvalid.jwt',
      });
      expect(res.status).toBe(401);
    });

    it('after admin resets password, old student cookie returns 401', async () => {
      const { cookie } = await createStudent({ phone: '0543333331' });
      const adminC = await adminCookie();

      const user = await testPrisma.users.findUniqueOrThrow({ where: { phone: '0543333331' } });

      // Admin resets password
      await callRoute(resetPasswordRoute, {
        method: 'POST',
        url: `/api/admin/users/${user.user_id}/reset-password`,
        cookie: adminC,
        params: { id: String(user.user_id) },
      });

      // Old cookie returns 401
      const res = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie,
      });
      expect(res.status).toBe(401);
    });

    it('after blocking, old cookie gets 401; after unblocking and re-login, 200', async () => {
      const { phone, password, cookie } = await createStudent({ phone: '0543333332' });
      const adminC = await adminCookie();
      const user = await testPrisma.users.findUniqueOrThrow({ where: { phone } });

      // Block user
      await callRoute(updateUserRoute, {
        method: 'PATCH',
        url: `/api/admin/users/${user.user_id}`,
        cookie: adminC,
        params: { id: String(user.user_id) },
        body: { isActive: false },
      });

      // Old cookie returns 401 (token_version was incremented on block)
      const blockedRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie,
      });
      expect(blockedRes.status).toBe(401);

      // Unblock user
      await callRoute(updateUserRoute, {
        method: 'PATCH',
        url: `/api/admin/users/${user.user_id}`,
        cookie: adminC,
        params: { id: String(user.user_id) },
        body: { isActive: true },
      });

      // Re-login works
      const loginRes = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password },
      });
      expect(loginRes.status).toBe(200);

      // New cookie works
      const meRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: loginRes.setCookie!,
      });
      expect(meRes.status).toBe(200);
    });

    it('silent renewal: student cookie signed 20 days ago returns new Set-Cookie; 1-day old cookie does not', async () => {
      const { id, cookie: _cookie } = await createStudent({ phone: '0543333333' });

      const user = await testPrisma.users.findUniqueOrThrow({ where: { user_id: id } });

      // Inject token signed 20 days ago (renewal threshold: remaining < 15 days)
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400 * 1000);
      const oldToken = await signSession(
        { userId: user.user_id, role: 'STUDENT', tokenVersion: user.token_version },
        twentyDaysAgo,
      );

      const renewRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: oldToken,
      });
      expect(renewRes.status).toBe(200);
      expect(renewRes.setCookie).toBeTruthy();

      // 1-day old cookie: no renewal needed
      const oneDayAgo = new Date(Date.now() - 1 * 86400 * 1000);
      const freshToken = await signSession(
        { userId: user.user_id, role: 'STUDENT', tokenVersion: user.token_version },
        oneDayAgo,
      );

      const noRenewRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: freshToken,
      });
      expect(noRenewRes.status).toBe(200);
      expect(noRenewRes.setCookie).toBeNull();
    });

    it('admin cookie signed 5 days ago: no Set-Cookie (admin has no renewal)', async () => {
      const phone = process.env.ADMIN_PHONE!;
      const dbAdmin = await testPrisma.users.findUniqueOrThrow({ where: { phone } });

      const fiveDaysAgo = new Date(Date.now() - 5 * 86400 * 1000);
      const token = await signSession(
        { userId: dbAdmin.user_id, role: 'ADMIN', tokenVersion: dbAdmin.token_version },
        fiveDaysAgo,
      );

      const res = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: token,
      });
      expect(res.status).toBe(200);
      expect(res.setCookie).toBeNull();
    });

    it('logout returns cookie with Max-Age=0, even without cookie in request', async () => {
      const res = await callRoute(logoutRoute, {
        method: 'POST',
        url: '/api/auth/logout',
      });
      expect(res.status).toBe(200);
      const rawSetCookie = res.headers.get('set-cookie') ?? '';
      expect(rawSetCookie.toLowerCase()).toContain('max-age=0');
    });
  });

  // ─── Permissions ─────────────────────────────────────────────────────────────

  describe('permissions', () => {
    it('student calling GET /api/admin/users returns 403 FORBIDDEN', async () => {
      const { cookie } = await createStudent({ phone: '0544444441' });

      const res = await callRoute(adminUsersRoute, {
        method: 'GET',
        url: '/api/admin/users?phone=0541234567',
        cookie,
      });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe('FORBIDDEN');
    });

    it('guest calling GET /api/admin/users returns 401 UNAUTHENTICATED', async () => {
      const res = await callRoute(adminUsersRoute, {
        method: 'GET',
        url: '/api/admin/users?phone=0541234567',
      });
      expect(res.status).toBe(401);
      expect(res.json.error.code).toBe('UNAUTHENTICATED');
    });

    it('POST without Origin header returns 403 BAD_ORIGIN', async () => {
      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone: '0541234567', password: 'pass1234' },
        origin: null,
      });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe('BAD_ORIGIN');
    });

    it('POST with foreign Origin returns 403 BAD_ORIGIN', async () => {
      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone: '0541234567', password: 'pass1234' },
        origin: 'https://evil.com',
      });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe('BAD_ORIGIN');
    });
  });

  // ─── Account ─────────────────────────────────────────────────────────────────

  describe('account', () => {
    it('PATCH /api/account updates name; name of 41 chars returns 400', async () => {
      const { cookie } = await createStudent({ phone: '0545555551' });

      // Valid name update
      const res = await callRoute(accountRoute, {
        method: 'PATCH',
        url: '/api/account',
        cookie,
        body: { fullName: 'שם חדש' },
      });
      expect(res.status).toBe(200);
      expect(res.json.user.fullName).toBe('שם חדש');

      // 41-char name
      const longName = 'א'.repeat(41);
      const badRes = await callRoute(accountRoute, {
        method: 'PATCH',
        url: '/api/account',
        cookie,
        body: { fullName: longName },
      });
      expect(badRes.status).toBe(400);
    });

    it('wrong current password returns 400 INVALID_CURRENT_PASSWORD (not 401)', async () => {
      const { cookie } = await createStudent({ phone: '0545555552', password: 'pass1234' });

      const res = await callRoute(changePasswordRoute, {
        method: 'POST',
        url: '/api/account/password',
        cookie,
        body: { currentPassword: 'wrongpass', newPassword: 'newpass123', newPasswordConfirm: 'newpass123' },
      });
      expect(res.status).toBe(400);
      expect(res.json.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('newPasswordConfirm different returns 400 PASSWORD_MISMATCH', async () => {
      const { cookie } = await createStudent({ phone: '0545555553', password: 'pass1234' });

      const res = await callRoute(changePasswordRoute, {
        method: 'POST',
        url: '/api/account/password',
        cookie,
        body: { currentPassword: 'pass1234', newPassword: 'newpass123', newPasswordConfirm: 'different123' },
      });
      expect(res.status).toBe(400);
      expect(res.json.error.code).toBe('PASSWORD_MISMATCH');
    });

    it('successful password change: returned cookie works, old cookie from other device gets 401', async () => {
      const { phone, cookie: oldCookie } = await createStudent({ phone: '0545555554', password: 'pass1234' });

      // Simulate "other device" by getting a second session before the change
      const otherDeviceCookie = await loginAs(phone, 'pass1234');

      // Change password
      const changeRes = await callRoute(changePasswordRoute, {
        method: 'POST',
        url: '/api/account/password',
        cookie: oldCookie,
        body: { currentPassword: 'pass1234', newPassword: 'newpass1234', newPasswordConfirm: 'newpass1234' },
      });
      expect(changeRes.status).toBe(200);
      expect(changeRes.setCookie).toBeTruthy();

      // New cookie from response works
      const newMe = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: changeRes.setCookie!,
      });
      expect(newMe.status).toBe(200);

      // Old cookie from "other device" gets 401
      const oldDeviceRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: otherDeviceCookie,
      });
      expect(oldDeviceRes.status).toBe(401);
    });
  });

  // ─── User management ─────────────────────────────────────────────────────────

  describe('user management', () => {
    it('search by phone in free format finds student; searching admin phone returns 404', async () => {
      const { phone } = await createStudent({ phone: '0546666661' });
      const adminC = await adminCookie();

      // Search in free format (normalized by schema)
      const formatted = `${phone.substring(0, 3)}-${phone.substring(3)}`;
      const res = await callRoute(adminUsersRoute, {
        method: 'GET',
        url: `/api/admin/users?phone=${encodeURIComponent(formatted)}`,
        cookie: adminC,
      });
      expect(res.status).toBe(200);
      expect(res.json.user.phone).toBe(phone);

      // Admin phone returns 404
      const adminPhone = process.env.ADMIN_PHONE!;
      const adminRes = await callRoute(adminUsersRoute, {
        method: 'GET',
        url: `/api/admin/users?phone=${encodeURIComponent(adminPhone)}`,
        cookie: adminC,
      });
      expect(adminRes.status).toBe(404);
      expect(adminRes.json.error.code).toBe('USER_NOT_FOUND');
    });

    it('password reset: login with DEFAULT_RESET_PASSWORD returns isDefaultPassword=true; lockout resets', async () => {
      const { phone } = await createStudent({ phone: '0546666662', password: 'originalpass' });
      const adminC = await adminCookie();

      // Lock the account first
      for (let i = 0; i < 5; i++) {
        await callRoute(loginRoute, {
          method: 'POST',
          url: '/api/auth/login',
          body: { phone, password: 'wrongpass' },
        });
      }

      const user = await testPrisma.users.findUniqueOrThrow({ where: { phone } });

      // Reset password
      await callRoute(resetPasswordRoute, {
        method: 'POST',
        url: `/api/admin/users/${user.user_id}/reset-password`,
        cookie: adminC,
        params: { id: String(user.user_id) },
      });

      // Login with DEFAULT_RESET_PASSWORD
      const res = await callRoute(loginRoute, {
        method: 'POST',
        url: '/api/auth/login',
        body: { phone, password: DEFAULT_RESET_PASSWORD },
      });
      expect(res.status).toBe(200);
      expect(res.json.isDefaultPassword).toBe(true);

      // Verify lockout was cleared
      const updatedUser = await testPrisma.users.findUniqueOrThrow({ where: { phone } });
      expect(updatedUser.failed_login_count).toBe(0);
      expect(updatedUser.locked_until).toBeNull();
    });

    it('resetting or blocking admin account returns 403 ADMIN_ACCOUNT_PROTECTED', async () => {
      const adminC = await adminCookie();
      const adminPhone = process.env.ADMIN_PHONE!;
      const adminUser = await testPrisma.users.findUniqueOrThrow({ where: { phone: adminPhone } });

      // Try to reset admin password
      const resetRes = await callRoute(resetPasswordRoute, {
        method: 'POST',
        url: `/api/admin/users/${adminUser.user_id}/reset-password`,
        cookie: adminC,
        params: { id: String(adminUser.user_id) },
      });
      expect(resetRes.status).toBe(403);
      expect(resetRes.json.error.code).toBe('ADMIN_ACCOUNT_PROTECTED');

      // Try to block admin
      const blockRes = await callRoute(updateUserRoute, {
        method: 'PATCH',
        url: `/api/admin/users/${adminUser.user_id}`,
        cookie: adminC,
        params: { id: String(adminUser.user_id) },
        body: { isActive: false },
      });
      expect(blockRes.status).toBe(403);
      expect(blockRes.json.error.code).toBe('ADMIN_ACCOUNT_PROTECTED');
    });

    it('POST /api/admin/password with 11-char new password returns 400; 12-char succeeds, new cookie works, other admin cookie gets 401', async () => {
      const adminC = await adminCookie();
      const adminC2 = await adminCookie(); // "other device"

      const currentPassword = process.env.ADMIN_PASSWORD!;

      // 11-char new password returns 400
      const badRes = await callRoute(adminPasswordRoute, {
        method: 'POST',
        url: '/api/admin/password',
        cookie: adminC,
        body: { currentPassword, newPassword: '12345678901', newPasswordConfirm: '12345678901' },
      });
      expect(badRes.status).toBe(400);

      // 12-char new password succeeds
      const newAdminPass = '123456789012';
      const goodRes = await callRoute(adminPasswordRoute, {
        method: 'POST',
        url: '/api/admin/password',
        cookie: adminC,
        body: { currentPassword, newPassword: newAdminPass, newPasswordConfirm: newAdminPass },
      });
      expect(goodRes.status).toBe(200);
      expect(goodRes.setCookie).toBeTruthy();

      // New cookie works
      const meRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: goodRes.setCookie!,
      });
      expect(meRes.status).toBe(200);

      // Other admin cookie (before change) gets 401
      const oldAdminRes = await callRoute(meRoute, {
        method: 'GET',
        url: '/api/auth/me',
        cookie: adminC2,
      });
      expect(oldAdminRes.status).toBe(401);
    });
  });
});
