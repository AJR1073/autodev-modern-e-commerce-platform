import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-response';

type InventoryItemResponse = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  inStock: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  updatedAt?: string;
};

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseStockNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return null;
}

function normalizeInventoryItem(product: any): InventoryItemResponse {
  const stock = typeof product.inventoryQuantity === 'number' ? product.inventoryQuantity : 0;
  const lowStockThreshold =
    typeof product.lowStockThreshold === 'number'
      ? product.lowStockThreshold
      : DEFAULT_LOW_STOCK_THRESHOLD;

  return {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku || '',
    price: Number(product.price || 0),
    stock,
    lowStockThreshold,
    isLowStock: stock <= lowStockThreshold,
    inStock: stock > 0,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null,
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const outOfStockOnly = searchParams.get('outOfStockOnly') === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = {
        OR: [{ slug: category }, { name: { equals: category, mode: 'insensitive' } }],
      };
    }

    if (outOfStockOnly) {
      where.inventoryQuantity = { lte: 0 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ inventoryQuantity: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    let items = products.map(normalizeInventoryItem);

    if (lowStockOnly) {
      items = items.filter((item) => item.isLowStock);
    }

    const lowStockCount = await prisma.product.count({
      where: {
        inventoryQuantity: {
          lte: DEFAULT_LOW_STOCK_THRESHOLD,
        },
      },
    });

    const outOfStockCount = await prisma.product.count({
      where: {
        inventoryQuantity: {
          lte: 0,
        },
      },
    });

    return successResponse({
      items,
      pagination: {
        page,
        limit,
        total: lowStockOnly ? items.length : total,
        totalPages: Math.max(1, Math.ceil((lowStockOnly ? items.length : total) / limit)),
      },
      summary: {
        lowStockCount,
        outOfStockCount,
        totalTracked: total,
      },
      filters: {
        search,
        category,
        lowStockOnly,
        outOfStockOnly,
      },
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return errorResponse('Failed to fetch inventory', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    const lowStockThreshold = parseStockNumber(body?.lowStockThreshold);

    if (!updates.length && lowStockThreshold === null) {
      return errorResponse('No inventory updates provided', 400);
    }

    const results: InventoryItemResponse[] = [];

    if (updates.length) {
      for (const update of updates) {
        const productId =
          typeof update?.productId === 'string' && update.productId.trim()
            ? update.productId.trim()
            : null;
        const stock = parseStockNumber(update?.stock);
        const threshold = parseStockNumber(update?.lowStockThreshold);

        if (!productId || stock === null) {
          continue;
        }

        const updated = await prisma.product.update({
          where: { id: productId },
          data: {
            inventoryQuantity: stock,
            ...(threshold !== null ? { lowStockThreshold: threshold } : {}),
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        results.push(normalizeInventoryItem(updated));
      }
    }

    return successResponse(
      {
        items: results,
        updatedCount: results.length,
      },
      results.length ? 'Inventory updated successfully' : 'No valid inventory updates were applied'
    );
  } catch (error) {
    console.error('PATCH /api/inventory error:', error);
    return errorResponse('Failed to update inventory', 500);
  }
}