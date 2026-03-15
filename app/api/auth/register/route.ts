import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function sanitizeName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function sanitizePassword(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const name = sanitizeName((body as Record<string, unknown>).name);
    const email = sanitizeEmail((body as Record<string, unknown>).email);
    const password = sanitizePassword((body as Record<string, unknown>).password);

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required.' },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Name must be between 2 and 100 characters.' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        data: user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register API error:', error);

    return NextResponse.json(
      { success: false, message: 'Unable to register account at this time.' },
      { status: 500 }
    );
  }
}