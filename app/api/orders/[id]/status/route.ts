import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_STATUSES = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

function normalizeStatus(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return ALLOWED_STATUSES.includes(normalized as (typeof ALLOWED_STATUSES)[number])
    ? normalized
    : null;
}

function buildStatusEmailHtml(orderId: string, status: string, trackingNumber?: string | null) {
  const trackingBlock = trackingNumber
    ? `<p style="margin:16px 0 0;">Tracking number: <strong>${trackingNumber}</strong></p>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h1 style="font-size:20px;margin:0 0 16px;">Order Status Update</h1>
      <p>Your order <strong>#${orderId}</strong> status has been updated to <strong>${status}</strong>.</p>
      ${trackingBlock}
      <p style="margin-top:16px;">Thank you for shopping with us.</p>
    </div>
  `;
}

async function sendStatusNotification(order: {
  id: string;
  status: string;
  trackingNumber?: string | null;
  customerEmail?: string | null;
}) {
  try {
    if (!order.customerEmail) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: order.customerEmail,
        subject: `Order #${order.id} update: ${order.status}`,
        html: buildStatusEmailHtml(order.id, order.status, order.trackingNumber),
      }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to send order status notification:', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const status = normalizeStatus(body?.status);
    const trackingNumber =
      typeof body?.trackingNumber === 'string' && body.trackingNumber.trim()
        ? body.trackingNumber.trim()
        : undefined;

    if (!status) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          allowedStatuses: ALLOWED_STATUSES,
        },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        customerEmail: true,
        trackingNumber: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(status === 'SHIPPED' && !trackingNumber && !existingOrder.trackingNumber
          ? { shippedAt: new Date() }
          : {}),
        ...(status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
        ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
      },
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        customerEmail: true,
        updatedAt: true,
      },
    });

    if (existingOrder.status !== updatedOrder.status || trackingNumber !== undefined) {
      await sendStatusNotification(updatedOrder);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}