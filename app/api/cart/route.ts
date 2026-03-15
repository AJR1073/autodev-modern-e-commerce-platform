import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CartBodyItem = {
  productId?: string;
  quantity?: number;
};

type CartPayload = {
  items?: CartBodyItem[];
};

function getCartId(request: NextRequest) {
  return request.cookies.get('cartId')?.value || '';
}

function sanitizeQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }

  return Math.floor(quantity);
}

async function getOrCreateCart(cartId?: string) {
  if (cartId) {
    const existingCart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (existingCart) {
      return existingCart;
    }
  }

  return prisma.cart.create({
    data: {},
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

async function buildCartResponse(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!cart) {
    return {
      id: cartId,
      items: [],
      itemCount: 0,
      subtotal: 0,
      currency: 'usd',
    };
  }

  const items = cart.items.map((item) => {
    const unitPrice = Number(item.product.price);
    const quantity = item.quantity;
    const lineTotal = unitPrice * quantity;

    return {
      id: item.id,
      productId: item.productId,
      quantity,
      unitPrice,
      lineTotal,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        sku: item.product.sku,
        price: unitPrice,
        images: item.product.images,
        inventory: item.product.inventory,
      },
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    items,
    itemCount,
    subtotal,
    currency: 'usd',
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cartId = getCartId(request);
    const cart = await getOrCreateCart(cartId);
    const responseBody = await buildCartResponse(cart.id);

    const response = NextResponse.json(
      {
        success: true,
        data: responseBody,
      },
      { status: 200 }
    );

    if (!cartId || cartId !== cart.id) {
      response.cookies.set('cartId', cart.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error('GET /api/cart error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cart.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CartPayload;
    const incomingItems = Array.isArray(body.items) ? body.items : [];

    if (incomingItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one cart item is required.',
        },
        { status: 400 }
      );
    }

    const normalizedItems = incomingItems
      .filter((item) => typeof item?.productId === 'string' && item.productId.trim().length > 0)
      .map((item) => ({
        productId: String(item.productId),
        quantity: sanitizeQuantity(item.quantity),
      }));

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cart items provided.',
        },
        { status: 400 }
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        inventory: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const missingProductIds = productIds.filter((id) => !productMap.has(id));

    if (missingProductIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some products could not be found.',
          details: {
            missingProductIds,
          },
        },
        { status: 404 }
      );
    }

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        continue;
      }

      if (typeof product.inventory === 'number' && product.inventory < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: 'Requested quantity exceeds available inventory.',
            details: {
              productId: item.productId,
              available: product.inventory,
            },
          },
          { status: 400 }
        );
      }
    }

    const existingCartId = getCartId(request);
    const cart = await getOrCreateCart(existingCartId);

    for (const item of normalizedItems) {
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: item.productId,
        },
      });

      if (existingItem) {
        const nextQuantity = existingItem.quantity + item.quantity;
        const product = productMap.get(item.productId);

        if (product && typeof product.inventory === 'number' && product.inventory < nextQuantity) {
          return NextResponse.json(
            {
              success: false,
              error: 'Requested quantity exceeds available inventory.',
              details: {
                productId: item.productId,
                available: product.inventory,
              },
            },
            { status: 400 }
          );
        }

        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: nextQuantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    const responseBody = await buildCartResponse(cart.id);
    const response = NextResponse.json(
      {
        success: true,
        message: 'Items added to cart.',
        data: responseBody,
      },
      { status: 201 }
    );

    response.cookies.set('cartId', cart.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('POST /api/cart error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update cart.',
      },
      { status: 500 }
    );
  }
}