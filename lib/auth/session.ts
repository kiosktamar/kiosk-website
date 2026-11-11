import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@/lib/contracts/api';
import {
  SESSION_COOKIE,
  STUDENT_SESSION_DAYS,
  ADMIN_SESSION_DAYS,
} from '@/lib/contracts/limits';
import { getEnv } from '@/lib/env';

export interface SessionPayload {
  userId: number;
  role: Role;
  tokenVersion: number;
}

export interface SessionClaims extends SessionPayload {
  issuedAt: number;
  expiresAt: number;
}

export function sessionMaxAgeSeconds(role: Role): number {
  return role === 'STUDENT' ? STUDENT_SESSION_DAYS * 86400 : ADMIN_SESSION_DAYS * 86400;
}

function getSecretKey(): Uint8Array {
  const secret = getEnv().JWT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload, now: Date = new Date()): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const maxAge = sessionMaxAgeSeconds(p.role);
  const exp = iat + maxAge;

  const key = getSecretKey();
  return new SignJWT({ role: p.role, tv: p.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(p.userId))
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });

    // Validate sub is a positive integer
    const sub = payload.sub;
    if (!sub || !/^\d+$/.test(sub)) return null;
    const userId = Number(sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    // Validate tv is an integer
    const tv = payload['tv'];
    if (typeof tv !== 'number' || !Number.isInteger(tv)) return null;

    const role = payload['role'];
    if (role !== 'STUDENT' && role !== 'ADMIN') return null;

    const iat = payload.iat;
    const exp = payload.exp;
    if (typeof iat !== 'number' || typeof exp !== 'number') return null;

    return {
      userId,
      role,
      tokenVersion: tv,
      issuedAt: iat,
      expiresAt: exp,
    };
  } catch {
    return null;
  }
}

export function shouldRenew(claims: SessionClaims, now: Date): boolean {
  if (claims.role !== 'STUDENT') return false;
  const nowSec = Math.floor(now.getTime() / 1000);
  const maxAge = sessionMaxAgeSeconds('STUDENT');
  const remaining = claims.expiresAt - nowSec;
  return remaining < maxAge / 2;
}

export function readSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function setSessionCookie(res: NextResponse, token: string, role: Role): void {
  const maxAge = sessionMaxAgeSeconds(role);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}
