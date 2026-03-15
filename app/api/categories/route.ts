import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, ok, serverError } from '@/lib/api-response';
import { createSlug } from '@/lib/slug';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const includeEmpty = searchParams.get('includeEmpty') === 'true';
    const featuredOnly = searchParams.get('featured') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const limitParam = Number(searchParams.get('limit') || '50');
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: search.toLowerCase(),
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (featuredOnly) {
      where.featured = true;
    }

    if (!includeEmpty) {
      where.products = {
        some: {
          isActive: true,
        },
      };
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      take: limit,
    });

    const data = categories.map((category) => ({
      ...category,
      productCount: category._count.products,
    }));

    return ok(data);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return serverError('Failed to fetch categories.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return badRequest('Invalid request body.');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    const image =
      typeof body.image === 'string' && body.image.trim()
        ? body.image.trim()
        : null;
    const featured = Boolean(body.featured);
    const providedSlug =
      typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';

    if (!name) {
      return badRequest('Category name is required.');
    }

    const baseSlug = createSlug(providedSlug || name);

    if (!baseSlug) {
      return badRequest('A valid category slug could not be generated.');
    }

    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existingCategory) {
        break;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image,
        featured,
      },
    });

    return ok(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return serverError('Failed to create category.');
  }
}