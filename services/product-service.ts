import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type ProductSortOption =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'featured';

export interface ProductListParams {
  page?: number;
  limit?: number;
  query?: string;
  categorySlug?: string;
  categoryId?: string;
  featured?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSortOption;
}

export interface ProductListResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

function normalizePage(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) return DEFAULT_PAGE;
  return Math.floor(value);
}

function normalizeLimit(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

function normalizePrice(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return undefined;
  return value;
}

function buildProductWhere(params: ProductListParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (typeof params.featured === 'boolean') {
    where.isFeatured = params.featured;
  }

  if (typeof params.inStock === 'boolean') {
    where.inventory = params.inStock
      ? {
          some: {
            quantity: {
              gt: 0,
            },
          },
        }
      : {
          none: {
            quantity: {
              gt: 0,
            },
          },
        };
  }

  const minPrice = normalizePrice(params.minPrice);
  const maxPrice = normalizePrice(params.maxPrice);

  if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
    where.price = {};
    if (typeof minPrice === 'number') where.price.gte = minPrice;
    if (typeof maxPrice === 'number') where.price.lte = maxPrice;
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params.categorySlug) {
    where.category = {
      ...(where.category || {}),
      slug: params.categorySlug,
    };
  }

  const query = params.query?.trim();
  if (query) {
    where.OR = [
      {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        sku: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        slug: {
          contains: query,
          mode: 'insensitive',
        },
      },
    ];
  }

  return where;
}

function buildProductOrderBy(sort?: ProductSortOption): Prisma.ProductOrderByWithRelationInput[] {
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
    case 'featured':
      return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }];
  }
}

const productListInclude = {
  category: true,
  inventory: true,
} satisfies Prisma.ProductInclude;

export const productService = {
  async list(params: ProductListParams = {}) {
    const page = normalizePage(params.page);
    const limit = normalizeLimit(params.limit);
    const skip = (page - 1) * limit;
    const where = buildProductWhere(params);
    const orderBy = buildProductOrderBy(params.sort);

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productListInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    } as ProductListResult<typeof items[number]>;
  },

  async listFeatured(limit = 8) {
    const take = normalizeLimit(limit);

    return prisma.product.findMany({
      where: {
        isFeatured: true,
      },
      include: productListInclude,
      orderBy: [{ createdAt: 'desc' }],
      take,
    });
  },

  async listByCategory(categorySlug: string, params: Omit<ProductListParams, 'categorySlug'> = {}) {
    return this.list({
      ...params,
      categorySlug,
    });
  },

  async search(query: string, params: Omit<ProductListParams, 'query'> = {}) {
    return this.list({
      ...params,
      query,
    });
  },

  async getById(id: string) {
    if (!id) return null;

    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
      },
    });
  },

  async getBySlug(slug: string) {
    if (!slug) return null;

    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        inventory: true,
      },
    });
  },

  async getBySku(sku: string) {
    if (!sku) return null;

    return prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        inventory: true,
      },
    });
  },

  async getRelatedProducts(productId: string, categoryId?: string, limit = 4) {
    if (!productId) return [];

    const take = normalizeLimit(limit);

    return prisma.product.findMany({
      where: {
        id: {
          not: productId,
        },
        ...(categoryId
          ? {
              categoryId,
            }
          : {}),
      },
      include: {
        category: true,
        inventory: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  },

  async create(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({
      data,
      include: {
        category: true,
        inventory: true,
      },
    });
  },

  async update(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        inventory: true,
      },
    });
  },

  async remove(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  },

  async getFilters() {
    const [priceAggregate, categories] = await Promise.all([
      prisma.product.aggregate({
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
    ]);

    return {
      priceRange: {
        min: priceAggregate._min.price ?? 0,
        max: priceAggregate._max.price ?? 0,
      },
      categories,
      sortOptions: [
        { label: 'Newest', value: 'newest' },
        { label: 'Oldest', value: 'oldest' },
        { label: 'Price: Low to High', value: 'price_asc' },
        { label: 'Price: High to Low', value: 'price_desc' },
        { label: 'Name: A to Z', value: 'name_asc' },
        { label: 'Name: Z to A', value: 'name_desc' },
        { label: 'Featured', value: 'featured' },
      ] as Array<{ label: string; value: ProductSortOption }>,
    };
  },

  async getInventorySnapshot(productId: string) {
    if (!productId) return null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        inventory: {
          select: {
            id: true,
            quantity: true,
            reservedQuantity: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!product) return null;

    const totals = product.inventory.reduce(
      (acc, item) => {
        acc.quantity += item.quantity ?? 0;
        acc.reservedQuantity += item.reservedQuantity ?? 0;
        return acc;
      },
      {
        quantity: 0,
        reservedQuantity: 0,
      },
    );

    return {
      ...product,
      inventorySummary: {
        quantity: totals.quantity,
        reservedQuantity: totals.reservedQuantity,
        availableQuantity: Math.max(0, totals.quantity - totals.reservedQuantity),
      },
    };
  },
};

export default productService;
// Named export for convenience
export const getFeaturedProducts = productService.listFeatured.bind(productService);
