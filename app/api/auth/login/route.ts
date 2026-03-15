import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { loginSchema } from '@/lib/validators/auth';
import { withRateLimit } from '@/lib/rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_token';

function getJwtSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

function parseMaxAge(expiresIn: string): number {
  const trimmed = expiresIn.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = trimmed.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 60 * 60 * 24 * 7;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return 60 * 60 * 24 * 7;
  }
}

async function handler(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'auth-login');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json().catch(() => null);

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid login credentials provided.',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    const maxAge = parseMaxAge(JWT_EXPIRES_IN);
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + maxAge)
      .sign(getJwtSecretKey());

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          token,
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred during login.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handler(request);
}