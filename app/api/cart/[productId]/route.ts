import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCartSession } from '@/lib/session';

type RouteContext = {
  params: {
    productId: string;
  };
};

function parseQuantity(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

async function getOrCreateCart(sessionCartId?: string) {
  if (sessionCartId) {
    const existingCart = await prisma.cart.findUnique({
      where: { id: sessionCartId },
    });

    if (existingCart) {
      return existingCart;
    }
  }

  const cart = await prisma.cart.create({
    data: {},
  });

  return cart;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const productId = context.params.productId;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const quantity = parseQuantity(body?.quantity);

    if (quantity === null) {
      return NextResponse.json(
        { success: false, message: 'A valid quantity is required.' },
        { status: 400 }
      );
    }

    if (quantity < 0) {
      return NextResponse.json(
        { success: false, message: 'Quantity cannot be negative.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        inventory: true,
        isActive: true,
      },
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, message: 'Product not found.' },
        { status: 404 }
      );
    }

    const session = await getCartSession();
    const cart = await getOrCreateCart(session?.cartId);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (quantity === 0) {
      if (existingItem) {
        await prisma.cartItem.delete({
          where: { id: existingItem.id },
        });
      }

      const updatedCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      const response = NextResponse.json(
        {
          success: true,
          message: 'Item removed from cart.',
          data: updatedCart,
        },
        { status: 200 }
      );

      if (!session?.cartId) {
        response.cookies.set('cartId', cart.id, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      return response;
    }

    if (typeof product.inventory === 'number' && quantity > product.inventory) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${product.inventory} item(s) available in stock.`,
        },
        { status: 400 }
      );
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Cart updated successfully.',
        data: updatedCart,
      },
      { status: 200 }
    );

    if (!session?.cartId) {
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
    console.error('PATCH /api/cart/[productId] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to update cart item.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const productId = context.params.productId;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required.' },
        { status: 400 }
      );
    }

    const session = await getCartSession();

    if (!session?.cartId) {
      return NextResponse.json(
        { success: true, message: 'Item removed from cart.', data: null },
        { status: 200 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { id: session.cartId },
    });

    if (!cart) {
      return NextResponse.json(
        { success: true, message: 'Item removed from cart.', data: null },
        { status: 200 }
      );
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    if (existingItem) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Item removed from cart.',
        data: updatedCart,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/cart/[productId] error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to remove cart item.' },
      { status: 500 }
    );
  }
}