import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

type RouteContext = {
  params: {
    id: string;
  };
};

function normalizeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
    status: order.status,
    paymentStatus: order.paymentStatus ?? null,
    fulfillmentStatus: order.fulfillmentStatus ?? null,
    currency: order.currency ?? 'usd',
    subtotal: Number(order.subtotal ?? 0),
    tax: Number(order.tax ?? 0),
    shipping: Number(order.shipping ?? 0),
    total: Number(order.total ?? 0),
    customerEmail: order.customerEmail ?? order.email ?? null,
    customerName: order.customerName ?? null,
    shippingAddress: order.shippingAddress ?? null,
    billingAddress: order.billingAddress ?? null,
    notes: order.notes ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.name ?? item.product?.name ?? 'Product',
          slug: item.product?.slug ?? null,
          sku: item.sku ?? item.product?.sku ?? null,
          image: item.image ?? item.product?.images?.[0] ?? item.product?.image ?? null,
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
          total: Number(item.total ?? Number(item.price ?? 0) * Number(item.quantity ?? 0)),
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                slug: item.product.slug ?? null,
                sku: item.product.sku ?? null,
              }
            : null,
        }))
      : [],
    user: order.user
      ? {
          id: order.user.id,
          name: order.user.name ?? null,
          email: order.user.email ?? null,
        }
      : null,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const orderId = context.params?.id;

    if (!orderId) {
      return errorResponse('Order id is required', 400);
    }

    const isAdmin = !!user && (user.role === 'ADMIN' || user.role === 'admin');

    const where = isAdmin
      ? { id: orderId }
      : {
          id: orderId,
          ...(user?.id
            ? { userId: user.id }
            : {}),
        };

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    if (!isAdmin && !user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    return successResponse(normalizeOrder(order));
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return errorResponse('Failed to fetch order', 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    const orderId = context.params?.id;

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';

    if (!isAdmin) {
      return errorResponse('Forbidden', 403);
    }

    if (!orderId) {
      return errorResponse('Order id is required', 400);
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      return errorResponse('Order not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      if (existingOrder.items.length > 0) {
        for (const item of existingOrder.items) {
          if (item.productId) {
            await tx.inventory.upsert({
              where: { productId: item.productId },
              update: {
                quantity: {
                  increment: Number(item.quantity ?? 0),
                },
              },
              create: {
                productId: item.productId,
                quantity: Number(item.quantity ?? 0),
              },
            });
          }
        }
      }

      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      await tx.order.delete({
        where: { id: orderId },
      });
    });

    return successResponse({ id: orderId, deleted: true }, 'Order deleted successfully');
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    return errorResponse('Failed to delete order', 500);
  }
}