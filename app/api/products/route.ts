import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  inventory: {
    quantity: number;
    inStock: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type ProductListResponse = {
  data: ProductListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    query: string;
    category: string;
    sort: string;
    minPrice: number | null;
    maxPrice: number | null;
    inStock: boolean | null;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parsePrice(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function parseBoolean(value: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function normalizeSort(value: string | null) {
  const sort = value || 'newest';

  switch (sort) {
    case 'newest':
    case 'oldest':
    case 'price_asc':
    case 'price_desc':
    case 'name_asc':
    case 'name_desc':
      return sort;
    default:
      return 'newest';
  }
}

function getOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'price_asc':
      return [{ price: 'asc' }, { createdAt: 'desc' }];
    case 'price_desc':
      return [{ price: 'desc' }, { createdAt: 'desc' }];
    case 'name_asc':
      return [{ name: 'asc' }];
    case 'name_desc':
      return [{ name: 'desc' }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }];
  }
}

function toNumberPrice(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return null;
  return Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const sort = normalizeSort(searchParams.get('sort'));
    const minPrice = parsePrice(searchParams.get('minPrice'));
    const maxPrice = parsePrice(searchParams.get('maxPrice'));
    const inStock = parseBoolean(searchParams.get('inStock'));

    const where: Prisma.ProductWhereInput = {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {},
        category
          ? {
              category: {
                OR: [
                  { slug: { equals: category, mode: 'insensitive' } },
                  { name: { equals: category, mode: 'insensitive' } },
                ],
              },
            }
          : {},
        minPrice !== null || maxPrice !== null
          ? {
              price: {
                ...(minPrice !== null ? { gte: minPrice } : {}),
                ...(maxPrice !== null ? { lte: maxPrice } : {}),
              },
            }
          : {},
        inStock === true
          ? {
              inventory: {
                some: {
                  quantity: {
                    gt: 0,
                  },
                },
              },
            }
          : {},
        inStock === false
          ? {
              OR: [
                {
                  inventory: {
                    none: {},
                  },
                },
                {
                  inventory: {
                    every: {
                      quantity: {
                        lte: 0,
                      },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: getOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          inventory: {
            select: {
              quantity: true,
            },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const data: ProductListItem[] = products.map((product) => {
      const inventoryRecord = Array.isArray(product.inventory) ? product.inventory[0] : null;
      const quantity = inventoryRecord?.quantity ?? 0;

      return {
        id: String(product.id),
        name: product.name,
        slug: product.slug,
        description: product.description ?? null,
        sku: product.sku,
        price: toNumberPrice(product.price) ?? 0,
        compareAtPrice: toNumberPrice((product as { compareAtPrice?: Prisma.Decimal | number | string | null }).compareAtPrice),
        images: Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : [],
        category: product.category
          ? {
              id: String(product.category.id),
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,
        inventory: {
          quantity,
          inStock: quantity > 0,
        },
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });

    const response: ProductListResponse = {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        query,
        category,
        sort,
        minPrice,
        maxPrice,
        inStock,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/products error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        data: [],
        meta: {
          page: DEFAULT_PAGE,
          limit: DEFAULT_LIMIT,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          query: '',
          category: '',
          sort: 'newest',
          minPrice: null,
          maxPrice: null,
          inStock: null,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
    const images = Array.isArray(body.images)
      ? body.images.filter((image: unknown): image is string => typeof image === 'string' && image.trim().length > 0)
      : [];
    const quantity =
      typeof body.quantity === 'number'
        ? Math.max(0, Math.floor(body.quantity))
        : typeof body.inventoryQuantity === 'number'
          ? Math.max(0, Math.floor(body.inventoryQuantity))
          : 0;

    const priceValue = typeof body.price === 'number' ? body.price : Number(body.price);

    if (!name || !slug || !sku || !categoryId) {
      return NextResponse.json(
        { error: 'name, slug, sku, and categoryId are required' },
        { status: 400 }
      );
    }

    if (Number.isNaN(priceValue) || priceValue < 0) {
      return NextResponse.json({ error: 'price must be a valid non-negative number' }, { status: 400 });
    }

    const [existingSlug, existingSku, category] = await Promise.all([
      prisma.product.findUnique({ where: { slug } }),
      prisma.product.findUnique({ where: { sku } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
    ]);

    if (existingSlug) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 });
    }

    if (existingSku) {
      return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 409 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const createdProduct = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        sku,
        price: priceValue,
        images,
        categoryId,
        inventory: {
          create: {
            quantity,
          },
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        inventory: {
          select: {
            quantity: true,
          },
          take: 1,
        },
      },
    });

    const inventoryRecord = Array.isArray(createdProduct.inventory) ? createdProduct.inventory[0] : null;
    const inventoryQuantity = inventoryRecord?.quantity ?? 0;

    return NextResponse.json(
      {
        data: {
          id: String(createdProduct.id),
          name: createdProduct.name,
          slug: createdProduct.slug,
          description: createdProduct.description ?? null,
          sku: createdProduct.sku,
          price: toNumberPrice(createdProduct.price) ?? 0,
          images: Array.isArray(createdProduct.images)
            ? createdProduct.images.filter((image): image is string => typeof image === 'string')
            : [],
          category: createdProduct.category
            ? {
                id: String(createdProduct.category.id),
                name: createdProduct.category.name,
                slug: createdProduct.category.slug,
              }
            : null,
          inventory: {
            quantity: inventoryQuantity,
            inStock: inventoryQuantity > 0,
          },
          createdAt: createdProduct.createdAt.toISOString(),
          updatedAt: createdProduct.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/products error:', error);

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}