import 'server-only';
import type { Db } from '@/lib/db';
import { Prisma } from '@/lib/db';
import type { Role, UserDTO } from '@/lib/contracts/api';
import { AppError } from '@/lib/errors/AppError';
import { Errors } from '@/lib/errors/errors';
import {
  DEFAULT_RESET_PASSWORD,
  LOCKOUT_ATTEMPTS,
  LOCKOUT_MINUTES,
  ADMIN_PASSWORD_MIN,
} from '@/lib/contracts/limits';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import type { SessionPayload } from '@/lib/auth/session';

export interface AuthResult {
  user: UserDTO;
  isDefaultPassword: boolean;
  session: SessionPayload;
}

export class AuthService {
  constructor(private readonly db: Db) {}

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    const user = await this.db.users.findUnique({ where: { phone } });
    return { exists: user !== null };
  }

  async register(input: {
    phone: string;
    fullName: string;
    password: string;
  }): Promise<AuthResult> {
    const hash = await hashPassword(input.password);
    try {
      const user = await this.db.users.create({
        data: {
          phone: input.phone,
          full_name: input.fullName,
          password_hash: hash,
          role: 'STUDENT',
        },
      });

      const isDefaultPassword = input.password === DEFAULT_RESET_PASSWORD;
      return {
        user: this.toUserDTO(user),
        isDefaultPassword,
        session: {
          userId: user.user_id,
          role: user.role as Role,
          tokenVersion: user.token_version,
        },
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('PHONE_ALREADY_REGISTERED');
      }
      throw err;
    }
  }

  async login(
    input: { phone: string; password: string },
    now: Date = new Date(),
  ): Promise<AuthResult> {
    // 1. Find user by phone
    const user = await this.db.users.findUnique({ where: { phone: input.phone } });
    if (!user) {
      throw Errors.invalidCredentials();
    }

    // 2. Check lockout (only STUDENT)
    if (user.role === 'STUDENT' && user.locked_until && user.locked_until > now) {
      throw Errors.accountLocked(user.locked_until);
    }

    // 3. Verify password
    const passwordOk = await verifyPassword(input.password, user.password_hash);

    // 4. Wrong password
    if (!passwordOk) {
      if (user.role === 'ADMIN') {
        throw Errors.invalidCredentials();
      }

      // STUDENT: increment failed count atomically
      const updated = await this.db.users.update({
        where: { user_id: user.user_id },
        data: { failed_login_count: { increment: 1 } },
      });
      const newCount = updated.failed_login_count;

      if (newCount >= LOCKOUT_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
        await this.db.users.update({
          where: { user_id: user.user_id },
          data: { locked_until: lockedUntil, failed_login_count: 0 },
        });
        throw Errors.accountLocked(lockedUntil);
      } else {
        throw Errors.invalidCredentials(LOCKOUT_ATTEMPTS - newCount);
      }
    }

    // 5. Correct password but blocked
    if (!user.is_active) {
      throw Errors.of('ACCOUNT_BLOCKED');
    }

    // 6. Clear failed login state if needed
    if (user.failed_login_count > 0 || user.locked_until !== null) {
      await this.db.users.update({
        where: { user_id: user.user_id },
        data: { failed_login_count: 0, locked_until: null },
      });
    }

    const isDefaultPassword = input.password === DEFAULT_RESET_PASSWORD;
    return {
      user: this.toUserDTO(user),
      isDefaultPassword,
      session: {
        userId: user.user_id,
        role: user.role as Role,
        tokenVersion: user.token_version,
      },
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<SessionPayload> {
    const user = await this.db.users.findUniqueOrThrow({ where: { user_id: userId } });

    const passwordOk = await verifyPassword(currentPassword, user.password_hash);
    if (!passwordOk) {
      throw new AppError('INVALID_CURRENT_PASSWORD');
    }

    // Admin-specific minimum password length check
    if (user.role === 'ADMIN' && newPassword.length < ADMIN_PASSWORD_MIN) {
      throw new AppError('VALIDATION_ERROR', {
        message: 'סיסמת המנהל חייבת להכיל לפחות 12 תווים',
      });
    }

    const hash = await hashPassword(newPassword);
    const updated = await this.db.users.update({
      where: { user_id: userId },
      data: {
        password_hash: hash,
        token_version: { increment: 1 },
      },
    });

    return {
      userId: updated.user_id,
      role: updated.role as Role,
      tokenVersion: updated.token_version,
    };
  }

  toUserDTO(user: {
    user_id: number;
    phone: string;
    full_name: string;
    role: string;
  }): UserDTO {
    return {
      id: user.user_id,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role as Role,
    };
  }
}
