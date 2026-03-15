import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productUpdateSchema } from '@/lib/validators/product';
import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { slugify } from '@/lib/slug';

type RouteContext = {
  params: {
    id: string;
  };
};

function parseProductId(id: string) {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { error: errorResponse('Authentication required', 401) };
  }

  const role = String((user as { role?: string }).role || '').toUpperCase();

  if (role !== 'ADMIN') {
    return { error: errorResponse('Forbidden', 403) };
  }

  return { user };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const productId = parseProductId(params.id);

    if (!productId) {
      return errorResponse('Invalid product id', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        inventory: true,
      },
    });

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return errorResponse('Failed to fetch product', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const productId = parseProductId(params.id);

    if (!productId) {
      return errorResponse('Invalid product id', 400);
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
      },
    });

    if (!existingProduct) {
      return errorResponse('Product not found', 404);
    }

    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Invalid product data', 400, parsed.error.flatten());
    }

    const data = parsed.data;

    const nextName = data.name ?? existingProduct.name;
    const nextSlug =
      typeof data.slug === 'string' && data.slug.trim().length > 0
        ? slugify(data.slug)
        : data.name
          ? slugify(data.name)
          : existingProduct.slug;

    if (nextSlug !== existingProduct.slug) {
      const slugConflict = await prisma.product.findFirst({
        where: {
          slug: nextSlug,
          NOT: {
            id: productId,
          },
        },
        select: { id: true },
      });

      if (slugConflict) {
        return errorResponse('A product with this slug already exists', 409);
      }
    }

    if (typeof data.sku === 'string' && data.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          NOT: {
            id: productId,
          },
        },
        select: { id: true },
      });

      if (skuConflict) {
        return errorResponse('A product with this SKU already exists', 409);
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...(data.name !== undefined ? { name: nextName } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.compareAtPrice !== undefined ? { compareAtPrice: data.compareAtPrice } : {}),
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
          ...(data.images !== undefined ? { images: data.images } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.slug !== undefined || data.name !== undefined ? { slug: nextSlug } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
          ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
          ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
          ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        },
        include: {
          category: true,
          inventory: true,
        },
      });

      if (data.inventoryQuantity !== undefined) {
        if (product.inventory) {
          await tx.inventory.update({
            where: { productId },
            data: {
              quantity: data.inventoryQuantity,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId,
              quantity: data.inventoryQuantity,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          inventory: true,
        },
      });
    });

    return successResponse(updatedProduct, 'Product updated successfully');
  } catch (error) {
    console.error('PATCH /api/products/[id] error:', error);
    return errorResponse('Failed to update product', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const productId = parseProductId(params.id);

    if (!productId) {
      return errorResponse('Invalid product id', 400);
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existingProduct) {
      return errorResponse('Product not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventory.deleteMany({
        where: { productId },
      });

      await tx.cartItem.deleteMany({
        where: { productId },
      });

      await tx.orderItem.deleteMany({
        where: { productId },
      });

      await tx.product.delete({
        where: { id: productId },
      });
    });

    return successResponse({ id: productId }, 'Product deleted successfully');
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return errorResponse('Failed to delete product', 500);
  }
}