import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_ALGORITHM = 'HS256';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_token';
const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const secretKey = new TextEncoder().encode(DEFAULT_JWT_SECRET);

export type UserRole = 'CUSTOMER' | 'ADMIN';

export type AuthTokenPayload = JWTPayload & {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
};

function normalizeRole(role?: string | null, email?: string | null): UserRole {
  if (role === 'ADMIN') return 'ADMIN';
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN';
  return 'CUSTOMER';
}

function mapUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: normalizeRole(user.role, user.email),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .setSubject(user.id)
    .sign(secretKey);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
    });

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return {
      ...payload,
      userId: payload.userId,
      email: payload.email,
      role: normalizeRole(payload.role, payload.email),
      firstName: typeof payload.firstName === 'string' ? payload.firstName : null,
      lastName: typeof payload.lastName === 'string' ? payload.lastName : null,
    } as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user?.password) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return mapUser(user);
}

export async function createUserAccount(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const role = normalizeRole(undefined, email);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      role,
    },
  });

  return mapUser(user);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) return null;

  return mapUser(user);
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }

  return user;
}

export function isAdminUser(user: Pick<AuthUser, 'role' | 'email'> | null | undefined): boolean {
  if (!user) return false;
  return normalizeRole(user.role, user.email) === 'ADMIN';
}

export async function loginUser(user: AuthUser): Promise<string> {
  const token = await signAuthToken(user);
  await setSessionCookie(token);
  return token;
}

export async function logoutUser() {
  await clearSessionCookie();
}