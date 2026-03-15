import { NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

const updateInventorySchema = z.object({
  quantity: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  reservedQuantity: z.coerce.number().int().min(0).optional(),
  sku: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().max(120).optional(),
  inStock: z.coerce.boolean().optional(),
});

function normalizeInventory(record: any) {
  return {
    id: record.id,
    productId: record.productId,
    quantity: record.quantity ?? 0,
    reservedQuantity: record.reservedQuantity ?? 0,
    availableQuantity:
      typeof record.availableQuantity === 'number'
        ? record.availableQuantity
        : Math.max((record.quantity ?? 0) - (record.reservedQuantity ?? 0), 0),
    lowStockThreshold: record.lowStockThreshold ?? 0,
    sku: record.sku ?? null,
    location: record.location ?? null,
    inStock:
      typeof record.inStock === 'boolean'
        ? record.inStock
        : (record.quantity ?? 0) - (record.reservedQuantity ?? 0) > 0,
    updatedAt: record.updatedAt,
    product: record.product
      ? {
          id: record.product.id,
          name: record.product.name,
          slug: record.product.slug,
          sku: record.product.sku ?? null,
        }
      : undefined,
  };
}

async function ensureAdmin() {
  const user = await getCurrentUser();

  const role = String((user as any)?.role || '').toUpperCase();
  if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
    return null;
  }

  return user;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;

    if (!productId) {
      return errorResponse('Product ID is required.', 400);
    }

    const inventory = await prisma.inventory.findFirst({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
          },
        },
      },
    });

    if (!inventory) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
        },
      });

      if (!product) {
        return errorResponse('Product not found.', 404);
      }

      return successResponse({
        id: null,
        productId: product.id,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        lowStockThreshold: 0,
        sku: product.sku ?? null,
        location: null,
        inStock: false,
        updatedAt: null,
        product,
      });
    }

    return successResponse(normalizeInventory(inventory));
  } catch (error) {
    console.error('GET /api/inventory/[productId] error:', error);
    return errorResponse('Failed to fetch inventory.', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const admin = await ensureAdmin();

    if (!admin) {
      return errorResponse('Unauthorized.', 401);
    }

    const productId = params.productId;

    if (!productId) {
      return errorResponse('Product ID is required.', 400);
    }

    const body = await request.json();
    const parsed = updateInventorySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.flatten(), 400);
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return errorResponse('No inventory fields provided.', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true },
    });

    if (!product) {
      return errorResponse('Product not found.', 404);
    }

    const existingInventory = await prisma.inventory.findFirst({
      where: { productId },
    });

    const nextQuantity = updates.quantity ?? existingInventory?.quantity ?? 0;
    const nextReservedQuantity =
      updates.reservedQuantity ?? existingInventory?.reservedQuantity ?? 0;

    if (nextReservedQuantity > nextQuantity) {
      return errorResponse('Reserved quantity cannot exceed total quantity.', 400);
    }

    const data: Record<string, unknown> = {
      ...('quantity' in updates ? { quantity: updates.quantity } : {}),
      ...('reservedQuantity' in updates
        ? { reservedQuantity: updates.reservedQuantity }
        : {}),
      ...('lowStockThreshold' in updates
        ? { lowStockThreshold: updates.lowStockThreshold }
        : {}),
      ...('sku' in updates ? { sku: updates.sku || product.sku || null } : {}),
      ...('location' in updates ? { location: updates.location || null } : {}),
      ...('inStock' in updates
        ? { inStock: updates.inStock }
        : {
            inStock: nextQuantity - nextReservedQuantity > 0,
          }),
    };

    const inventory = existingInventory
      ? await prisma.inventory.update({
          where: { id: existingInventory.id },
          data,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
              },
            },
          },
        })
      : await prisma.inventory.create({
          data: {
            productId,
            quantity: nextQuantity,
            reservedQuantity: nextReservedQuantity,
            lowStockThreshold: updates.lowStockThreshold ?? 0,
            sku: updates.sku || product.sku || null,
            location: updates.location || null,
            inStock:
              typeof updates.inStock === 'boolean'
                ? updates.inStock
                : nextQuantity - nextReservedQuantity > 0,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
              },
            },
          },
        });

    return successResponse(normalizeInventory(inventory), 'Inventory updated successfully.');
  } catch (error) {
    console.error('PATCH /api/inventory/[productId] error:', error);
    return errorResponse('Failed to update inventory.', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const admin = await ensureAdmin();

    if (!admin) {
      return errorResponse('Unauthorized.', 401);
    }

    const productId = params.productId;

    if (!productId) {
      return errorResponse('Product ID is required.', 400);
    }

    const inventory = await prisma.inventory.findFirst({
      where: { productId },
      select: { id: true },
    });

    if (!inventory) {
      return errorResponse('Inventory record not found.', 404);
    }

    await prisma.inventory.delete({
      where: { id: inventory.id },
    });

    return successResponse({ productId }, 'Inventory record deleted successfully.');
  } catch (error) {
    console.error('DELETE /api/inventory/[productId] error:', error);
    return errorResponse('Failed to delete inventory record.', 500);
  }
}