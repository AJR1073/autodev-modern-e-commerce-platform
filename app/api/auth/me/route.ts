import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthTokenFromRequest, verifyAuthToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);

    if (!token) {
      return apiError('Unauthorized', 401);
    }

    const payload = await verifyAuthToken(token);

    if (!payload?.sub) {
      return apiError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return apiError('Failed to fetch current user', 500);
  }
}