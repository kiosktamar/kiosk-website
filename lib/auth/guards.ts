import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { Role } from '@/lib/contracts/api';
import { AppError } from '@/lib/errors/AppError';
import { prisma } from '@/lib/db';
import { readSessionToken, verifySession } from './session';
import type { SessionClaims } from './session';

export interface AuthUser {
  id: number;
  role: Role;
  fullName: string;
  phone: string;
}

async function resolveUserFromClaims(
  claims: SessionClaims,
): Promise<AuthUser> {
  const dbUser = await prisma.users.findUnique({
    where: { user_id: claims.userId },
  });

  if (!dbUser) {
    throw new AppError('UNAUTHENTICATED');
  }

  if (dbUser.token_version !== claims.tokenVersion) {
    throw new AppError('UNAUTHENTICATED');
  }

  if (!dbUser.is_active) {
    throw new AppError('ACCOUNT_BLOCKED');
  }

  return {
    id: dbUser.user_id,
    role: dbUser.role as Role,
    fullName: dbUser.full_name,
    phone: dbUser.phone,
  };
}

export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const token = readSessionToken(req);
  if (!token) {
    throw new AppError('UNAUTHENTICATED');
  }

  const claims = await verifySession(token);
  if (!claims) {
    throw new AppError('UNAUTHENTICATED');
  }

  return resolveUserFromClaims(claims);
}

export async function requireStudent(req: NextRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== 'STUDENT') {
    throw new AppError('FORBIDDEN');
  }
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN');
  }
  return user;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('kt_session')?.value;
    if (!token) return null;

    const claims = await verifySession(token);
    if (!claims) return null;

    const dbUser = await prisma.users.findUnique({
      where: { user_id: claims.userId },
    });

    if (!dbUser) return null;
    if (dbUser.token_version !== claims.tokenVersion) return null;
    if (!dbUser.is_active) return null;

    return {
      id: dbUser.user_id,
      role: dbUser.role as Role,
      fullName: dbUser.full_name,
      phone: dbUser.phone,
    };
  } catch {
    return null;
  }
}

export async function requireUserWithClaims(
  req: NextRequest,
): Promise<{ user: AuthUser; claims: SessionClaims }> {
  const token = readSessionToken(req);
  if (!token) {
    throw new AppError('UNAUTHENTICATED');
  }

  const claims = await verifySession(token);
  if (!claims) {
    throw new AppError('UNAUTHENTICATED');
  }

  const user = await resolveUserFromClaims(claims);
  return { user, claims };
}
