import 'server-only';
import type { Db } from '@/lib/db';
import type { Role, UserDTO, AdminUserDTO } from '@/lib/contracts/api';
import { AppError } from '@/lib/errors/AppError';
import { DEFAULT_RESET_PASSWORD } from '@/lib/contracts/limits';
import { hashPassword } from '@/lib/auth/password';
import type { AuthService } from './AuthService';

export class UserService {
  constructor(private readonly db: Db) {}

  async getMe(userId: number): Promise<UserDTO> {
    const user = await this.db.users.findUniqueOrThrow({ where: { user_id: userId } });
    return {
      id: user.user_id,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role as Role,
    };
  }

  async updateName(userId: number, fullName: string): Promise<UserDTO> {
    const user = await this.db.users.update({
      where: { user_id: userId },
      data: { full_name: fullName },
    });
    return {
      id: user.user_id,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role as Role,
    };
  }

  async findStudentByPhone(phone: string): Promise<AdminUserDTO> {
    const user = await this.db.users.findUnique({
      where: { phone },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new AppError('USER_NOT_FOUND');
    }

    return this.toAdminUserDTO(user);
  }

  async resetPassword(targetUserId: number): Promise<void> {
    const user = await this.db.users.findUnique({ where: { user_id: targetUserId } });
    if (!user) {
      throw new AppError('NOT_FOUND');
    }
    if (user.role === 'ADMIN') {
      throw new AppError('ADMIN_ACCOUNT_PROTECTED');
    }

    const hash = await hashPassword(DEFAULT_RESET_PASSWORD);
    await this.db.users.update({
      where: { user_id: targetUserId },
      data: {
        password_hash: hash,
        token_version: { increment: 1 },
        failed_login_count: 0,
        locked_until: null,
      },
    });
  }

  async setActive(targetUserId: number, isActive: boolean): Promise<AdminUserDTO> {
    const user = await this.db.users.findUnique({ where: { user_id: targetUserId } });
    if (!user) {
      throw new AppError('NOT_FOUND');
    }
    if (user.role === 'ADMIN') {
      throw new AppError('ADMIN_ACCOUNT_PROTECTED');
    }

    const updateData: Record<string, unknown> = { is_active: isActive };
    if (!isActive) {
      // Blocking: also invalidate sessions
      updateData.token_version = { increment: 1 };
    }

    const updated = await this.db.users.update({
      where: { user_id: targetUserId },
      data: updateData,
    });

    return this.toAdminUserDTO(updated);
  }

  private toAdminUserDTO(user: {
    user_id: number;
    full_name: string;
    phone: string;
    is_active: boolean;
    created_at: Date;
  }): AdminUserDTO {
    return {
      id: user.user_id,
      fullName: user.full_name,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at.toISOString(),
    };
  }
}

// Satisfy the unused import for AuthService (it's referenced in index.ts)
export type { AuthService };
