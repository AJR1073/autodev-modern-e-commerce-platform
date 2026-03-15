import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { formatApiError, successResponse } from '@/lib/api-response';
import { getPaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { getSessionUser } from '@/lib/session';
import { orderCreateSchema, orderQuerySchema } from '@/lib/validators/order';

type OrderListWhere = Prisma.OrderWhereInput;

function parseSearchParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return {
    page: searchParams.get('page') ?? '1',
    limit: searchParams.get('limit') ?? '10',
    status: searchParams.get('status') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    email: searchParams.get('email') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? 'createdAt',
    sortOrder: searchParams.get('sortOrder') ?? 'desc',
  };
}

function buildWhereClause(filters: {
  status?: string;
  userId?: string;
  email?: string;
  q?: string;
  isAdmin: boolean;
  sessionUserId?: string | null;
}): OrderListWhere {
  const where: OrderListWhere = {};

  if (!filters.isAdmin) {
    if (filters.sessionUserId) {
      where.userId = filters.sessionUserId;
    } else if (filters.email) {
      where.email = {
        equals: filters.email,
        mode: 'insensitive',
      };
    } else {
      where.id = '__no_access__';
    }

    return where;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.email) {
    where.email = {
      contains: filters.email,
      mode: 'insensitive',
    };
  }

  if (filters.q) {
    where.OR = [
      {
        id: {
          contains: filters.q,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: filters.q,
          mode: 'insensitive',
        },
      },
      {
        customerName: {
          contains: filters.q,
          mode: 'insensitive',
        },
      },
    ];
  }

  return where;
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>;

    const quantity = Number(record.quantity ?? 0);
    const price = Number(record.price ?? 0);

    return {
      productId: String(record.productId ?? ''),
      name: String(record.name ?? ''),
      slug: record.slug ? String(record.slug) : null,
      sku: record.sku ? String(record.sku) : null,
      image: record.image ? String(record.image) : null,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      price: Number.isFinite(price) ? price : 0,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const rawParams = parseSearchParams(request);

    const parsedQuery = orderQuerySchema.safeParse(rawParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        formatApiError('Invalid order query parameters.', 400, parsedQuery.error.flatten()),
        { status: 400 }
      );
    }

    const { page, limit } = getPaginationParams({
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
    });

    const isAdmin = sessionUser?.role === 'ADMIN';

    const where = buildWhereClause({
      status: parsedQuery.data.status,
      userId: parsedQuery.data.userId,
      email: parsedQuery.data.email,
      q: parsedQuery.data.q,
      isAdmin,
      sessionUserId: sessionUser?.id,
    });

    const sortBy = parsedQuery.data.sortBy || 'createdAt';
    const sortOrder = parsedQuery.data.sortOrder || 'desc';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json(
      successResponse(
        {
          orders,
          pagination: buildPaginationMeta({ page, limit, total }),
        },
        'Orders retrieved successfully.'
      )
    );
  } catch (error) {
    return NextResponse.json(formatApiError(error, 500), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const body = await request.json();

    const parsedBody = orderCreateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        formatApiError('Invalid order payload.', 400, parsedBody.error.flatten()),
        { status: 400 }
      );
    }

    const data = parsedBody.data;
    const items = normalizeItems(data.items);

    if (!items.length) {
      return NextResponse.json(formatApiError('Order must contain at least one item.', 400), {
        status: 400,
      });
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        inventoryQuantity: true,
        images: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          formatApiError(`Product not found for item: ${item.productId}`, 404),
          { status: 404 }
        );
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          formatApiError(`Invalid quantity for product: ${product.name}`, 400),
          { status: 400 }
        );
      }

      if (product.inventoryQuantity < item.quantity) {
        return NextResponse.json(
          formatApiError(`Insufficient inventory for product: ${product.name}`, 400),
          { status: 400 }
        );
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      const price = Number(product?.price ?? item.price ?? 0);
      return sum + price * item.quantity;
    }, 0);

    const shippingAmount = Number(data.shippingAmount ?? 0);
    const taxAmount = Number(data.taxAmount ?? 0);
    const totalAmount =
      Number(data.totalAmount ?? subtotal + shippingAmount + taxAmount) ||
      subtotal + shippingAmount + taxAmount;

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = productMap.get(item.productId)!;

        await tx.product.update({
          where: { id: product.id },
          data: {
            inventoryQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return tx.order.create({
        data: {
          userId: sessionUser?.id ?? data.userId ?? null,
          email: data.email,
          customerName: data.customerName,
          status: data.status ?? 'PENDING',
          subtotalAmount: subtotal,
          shippingAmount,
          taxAmount,
          totalAmount,
          currency: data.currency ?? 'USD',
          notes: data.notes ?? null,
          shippingAddress:
            data.shippingAddress && typeof data.shippingAddress === 'object'
              ? (data.shippingAddress as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          billingAddress:
            data.billingAddress && typeof data.billingAddress === 'object'
              ? (data.billingAddress as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          paymentIntentId: data.paymentIntentId ?? null,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              const firstImage =
                Array.isArray(product.images) && product.images.length > 0
                  ? String(product.images[0])
                  : null;
              const unitPrice = Number(product.price);

              return {
                productId: product.id,
                name: product.name,
                slug: product.slug,
                sku: product.sku,
                image: firstImage,
                quantity: item.quantity,
                price: unitPrice,
              };
            }),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
      });
    });

    return NextResponse.json(
      successResponse(order, 'Order created successfully.'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(formatApiError(error, 500), { status: 500 });
  }
}