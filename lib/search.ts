import type { Prisma } from '@prisma/client';

export type SearchSortOption =
  | 'relevance'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc';

export interface ProductSearchParams {
  query?: string | null;
  categorySlug?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean | null;
  featured?: boolean | null;
  tags?: string[] | null;
  sort?: SearchSortOption | null;
}

export interface SearchToken {
  value: string;
  normalized: string;
}

const MAX_QUERY_LENGTH = 200;
const MAX_TOKENS = 8;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function sanitizeSearchQuery(query?: string | null): string {
  if (!query) {
    return '';
  }

  return normalizeWhitespace(query).slice(0, MAX_QUERY_LENGTH);
}

export function normalizeSearchValue(value?: string | null): string {
  if (!value) {
    return '';
  }

  return sanitizeSearchQuery(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function tokenizeSearchQuery(query?: string | null): SearchToken[] {
  const sanitized = sanitizeSearchQuery(query);

  if (!sanitized) {
    return [];
  }

  const rawTokens = sanitized
    .split(/[\s,./\\|+_-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, MAX_TOKENS);

  return rawTokens.map((token) => ({
    value: token,
    normalized: normalizeSearchValue(token),
  }));
}

export function buildProductSearchWhere(
  params: ProductSearchParams = {},
): Prisma.ProductWhereInput {
  const tokens = tokenizeSearchQuery(params.query);
  const andConditions: Prisma.ProductWhereInput[] = [];

  if (tokens.length > 0) {
    andConditions.push({
      AND: tokens.map((token) => ({
        OR: [
          {
            name: {
              contains: token.value,
              mode: 'insensitive',
            },
          },
          {
            slug: {
              contains: token.normalized,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: token.value,
              mode: 'insensitive',
            },
          },
          {
            sku: {
              contains: token.value,
              mode: 'insensitive',
            },
          },
        ],
      })),
    });
  }

  if (params.categorySlug) {
    andConditions.push({
      category: {
        slug: params.categorySlug,
      },
    });
  }

  if (typeof params.minPrice === 'number' && !Number.isNaN(params.minPrice)) {
    andConditions.push({
      price: {
        gte: params.minPrice,
      },
    });
  }

  if (typeof params.maxPrice === 'number' && !Number.isNaN(params.maxPrice)) {
    andConditions.push({
      price: {
        lte: params.maxPrice,
      },
    });
  }

  if (params.inStock === true) {
    andConditions.push({
      inventory: {
        some: {
          quantity: {
            gt: 0,
          },
        },
      },
    });
  }

  if (typeof params.featured === 'boolean') {
    andConditions.push({
      featured: params.featured,
    });
  }

  if (params.tags && params.tags.length > 0) {
    andConditions.push({
      tags: {
        hasSome: params.tags.filter(Boolean),
      },
    });
  }

  if (andConditions.length === 0) {
    return {};
  }

  return {
    AND: andConditions,
  };
}

export function buildProductSearchOrderBy(
  sort?: SearchSortOption | null,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }];
    case 'price-asc':
      return [{ price: 'asc' }, { createdAt: 'desc' }];
    case 'price-desc':
      return [{ price: 'desc' }, { createdAt: 'desc' }];
    case 'name-asc':
      return [{ name: 'asc' }];
    case 'name-desc':
      return [{ name: 'desc' }];
    case 'relevance':
    default:
      return [{ featured: 'desc' }, { createdAt: 'desc' }];
  }
}

export function calculateSearchScore(
  product: {
    name?: string | null;
    slug?: string | null;
    description?: string | null;
    sku?: string | null;
    tags?: string[] | null;
    featured?: boolean | null;
  },
  query?: string | null,
): number {
  const tokens = tokenizeSearchQuery(query);

  if (tokens.length === 0) {
    return product.featured ? 1 : 0;
  }

  const name = normalizeSearchValue(product.name);
  const slug = normalizeSearchValue(product.slug);
  const description = normalizeSearchValue(product.description);
  const sku = normalizeSearchValue(product.sku);
  const tags = (product.tags || []).map((tag) => normalizeSearchValue(tag));

  let score = 0;

  for (const token of tokens) {
    if (!token.normalized) {
      continue;
    }

    if (name === token.normalized) {
      score += 100;
    } else if (name.startsWith(token.normalized)) {
      score += 40;
    } else if (name.includes(token.normalized)) {
      score += 25;
    }

    if (sku === token.normalized) {
      score += 80;
    } else if (sku.includes(token.normalized)) {
      score += 30;
    }

    if (slug.includes(token.normalized)) {
      score += 20;
    }

    if (description.includes(token.normalized)) {
      score += 10;
    }

    if (tags.some((tag) => tag.includes(token.normalized))) {
      score += 15;
    }
  }

  if (product.featured) {
    score += 5;
  }

  return score;
}

export function sortProductsByRelevance<T extends {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  sku?: string | null;
  tags?: string[] | null;
  featured?: boolean | null;
  createdAt?: Date | string | null;
}>(
  products: T[],
  query?: string | null,
): T[] {
  return [...products].sort((a, b) => {
    const scoreA = calculateSearchScore(a, query);
    const scoreB = calculateSearchScore(b, query);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return dateB - dateA;
  });
}

export function parseSearchSort(value?: string | null): SearchSortOption {
  switch (value) {
    case 'newest':
    case 'price-asc':
    case 'price-desc':
    case 'name-asc':
    case 'name-desc':
    case 'relevance':
      return value;
    default:
      return 'relevance';
  }
}

export function parsePriceFilter(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parseBooleanFilter(value?: string | null): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

export function extractSearchParamsFromUrlParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): ProductSearchParams {
  const getValue = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key);
    }

    const value = params[key];

    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return value || null;
  };

  const getValues = (key: string): string[] => {
    if (params instanceof URLSearchParams) {
      return params.getAll(key).filter(Boolean);
    }

    const value = params[key];

    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    return value ? [value] : [];
  };

  return {
    query: getValue('q'),
    categorySlug: getValue('category'),
    minPrice: parsePriceFilter(getValue('minPrice')),
    maxPrice: parsePriceFilter(getValue('maxPrice')),
    inStock: parseBooleanFilter(getValue('inStock')),
    featured: parseBooleanFilter(getValue('featured')),
    tags: getValues('tag'),
    sort: parseSearchSort(getValue('sort')),
  };
}