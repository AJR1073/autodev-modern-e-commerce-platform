import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export type SessionRole = 'CUSTOMER' | 'ADMIN';

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: SessionRole;
};

export type SessionPayload = JWTPayload & {
  user: SessionUser;
};

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);

const secretKey = new TextEncoder().encode(SESSION_SECRET);

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

export async function signSessionToken(user: SessionUser) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload || typeof payload !== 'object' || !('user' in payload)) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  const { name, options } = getCookieOptions();

  cookieStore.set(name, token, options);

  return token;
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  const { name } = getCookieOptions();

  return cookieStore.get(name)?.value || null;
}

export async function getSession() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}

export async function updateSession(user: SessionUser) {
  return createSession(user);
}

export async function clearSession() {
  const cookieStore = await cookies();
  const { name } = getCookieOptions();

  cookieStore.delete(name);
}

export function isAdminRole(role?: string | null): role is SessionRole {
  return role === 'ADMIN' || role === 'CUSTOMER';
}