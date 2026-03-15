import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { calculateCartTotals } from '@/lib/format';
import {
  addToCartSchema,
  removeFromCartSchema,
  updateCartItemSchema,
} from '@/lib/validators/cart';

type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: {
    product: true;
  };
}>;

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type CartSummary = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    slug: string;
    sku: string;
    image: string | null;
    price: number;
    quantity: number;
    stock: number;
    subtotal: number;
  }>;
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  updatedAt: Date;
};

type GetOrCreateCartInput = {
  userId?: string | null;
  sessionId?: string | null;
};

type AddToCartInput = {
  userId?: string | null;
  sessionId?: string | null;
  productId: string;
  quantity?: number;
};

type UpdateCartItemInput = {
  userId?: string | null;
  sessionId?: string | null;
  productId: string;
  quantity: number;
};

type RemoveCartItemInput = {
  userId?: string | null;
  sessionId?: string | null;
  productId: string;
};

type MergeCartInput = {
  userId: string;
  sessionId: string;
};

function ensureCartOwner(input: GetOrCreateCartInput) {
  if (!input.userId && !input.sessionId) {
    throw new Error('A userId or sessionId is required to access a cart.');
  }
}

function getCartWhere(input: GetOrCreateCartInput) {
  if (input.userId) {
    return { userId: input.userId };
  }

  return { sessionId: input.sessionId as string };
}

function normalizePrice(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function serializeCart(cart: CartWithItems | null): CartSummary | null {
  if (!cart) return null;

  const items = cart.items.map((item) => {
    const price = normalizePrice(item.product.price);
    const stock = typeof item.product.inventoryQuantity === 'number' ? item.product.inventoryQuantity : 0;

    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      sku: item.product.sku,
      image: item.product.images[0] || null,
      price,
      quantity: item.quantity,
      stock,
      subtotal: price * item.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totals =
    typeof calculateCartTotals === 'function'
      ? calculateCartTotals(subtotal)
      : {
          subtotal,
          tax: 0,
          shipping: subtotal > 0 ? 0 : 0,
          total: subtotal,
        };

  return {
    id: cart.id,
    userId: cart.userId,
    sessionId: cart.sessionId,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: totals.subtotal ?? subtotal,
    tax: totals.tax ?? 0,
    shipping: totals.shipping ?? 0,
    total: totals.total ?? subtotal,
    currency: 'USD',
    updatedAt: cart.updatedAt,
  };
}

async function fetchCart(input: GetOrCreateCartInput) {
  ensureCartOwner(input);

  return prisma.cart.findUnique({
    where: getCartWhere(input),
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

async function touchCart(cartId: string) {
  await prisma.cart.update({
    where: { id: cartId },
    data: { updatedAt: new Date() },
  });
}

async function validateProductAvailability(productId: string, requestedQuantity: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('Product not found.');
  }

  const inventoryQuantity =
    typeof product.inventoryQuantity === 'number' ? product.inventoryQuantity : 0;

  if (!product.isActive) {
    throw new Error('This product is currently unavailable.');
  }

  if (inventoryQuantity < requestedQuantity) {
    throw new Error('Requested quantity exceeds available inventory.');
  }

  return product;
}

export const cartService = {
  async getOrCreateCart(input: GetOrCreateCartInput): Promise<CartSummary> {
    ensureCartOwner(input);

    let cart = await fetchCart(input);

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: input.userId ?? null,
          sessionId: input.userId ? null : input.sessionId ?? null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return serializeCart(cart) as CartSummary;
  },

  async getCart(input: GetOrCreateCartInput): Promise<CartSummary | null> {
    const cart = await fetchCart(input);
    return serializeCart(cart);
  },

  async addItem(input: AddToCartInput): Promise<CartSummary> {
    const parsed = addToCartSchema.parse({
      productId: input.productId,
      quantity: input.quantity ?? 1,
    });

    const quantityToAdd = parsed.quantity;
    const cart = await this.getOrCreateCart({
      userId: input.userId,
      sessionId: input.sessionId,
    });

    const existingItem = cart.items.find((item) => item.productId === parsed.productId);
    const nextQuantity = (existingItem?.quantity ?? 0) + quantityToAdd;

    await validateProductAvailability(parsed.productId, nextQuantity);

    const persistedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
    });

    if (!persistedCart) {
      throw new Error('Cart not found.');
    }

    if (existingItem) {
      await prisma.cartItem.updateMany({
        where: {
          cartId: cart.id,
          productId: parsed.productId,
        },
        data: {
          quantity: nextQuantity,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: parsed.productId,
          quantity: quantityToAdd,
        },
      });
    }

    await touchCart(cart.id);

    const updatedCart = await fetchCart({
      userId: persistedCart.userId,
      sessionId: persistedCart.sessionId,
    });

    return serializeCart(updatedCart) as CartSummary;
  },

  async updateItem(input: UpdateCartItemInput): Promise<CartSummary> {
    const parsed = updateCartItemSchema.parse({
      productId: input.productId,
      quantity: input.quantity,
    });

    const cart = await fetchCart({
      userId: input.userId,
      sessionId: input.sessionId,
    });

    if (!cart) {
      throw new Error('Cart not found.');
    }

    const existingItem = cart.items.find((item) => item.productId === parsed.productId);

    if (!existingItem) {
      throw new Error('Cart item not found.');
    }

    if (parsed.quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
    } else {
      await validateProductAvailability(parsed.productId, parsed.quantity);

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: parsed.quantity,
          updatedAt: new Date(),
        },
      });
    }

    await touchCart(cart.id);

    const updatedCart = await fetchCart({
      userId: cart.userId,
      sessionId: cart.sessionId,
    });

    return serializeCart(updatedCart) as CartSummary;
  },

  async removeItem(input: RemoveCartItemInput): Promise<CartSummary> {
    const parsed = removeFromCartSchema.parse({
      productId: input.productId,
    });

    const cart = await fetchCart({
      userId: input.userId,
      sessionId: input.sessionId,
    });

    if (!cart) {
      throw new Error('Cart not found.');
    }

    const existingItem = cart.items.find((item) => item.productId === parsed.productId);

    if (!existingItem) {
      return serializeCart(cart) as CartSummary;
    }

    await prisma.cartItem.delete({
      where: { id: existingItem.id },
    });

    await touchCart(cart.id);

    const updatedCart = await fetchCart({
      userId: cart.userId,
      sessionId: cart.sessionId,
    });

    return serializeCart(updatedCart) as CartSummary;
  },

  async clearCart(input: GetOrCreateCartInput): Promise<CartSummary> {
    const cart = await fetchCart(input);

    if (!cart) {
      return this.getOrCreateCart(input);
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await touchCart(cart.id);

    const updatedCart = await fetchCart({
      userId: cart.userId,
      sessionId: cart.sessionId,
    });

    return serializeCart(updatedCart) as CartSummary;
  },

  async mergeGuestCartIntoUserCart(input: MergeCartInput): Promise<CartSummary> {
    const guestCart = await fetchCart({ sessionId: input.sessionId });
    const userCart = await this.getOrCreateCart({ userId: input.userId });

    if (!guestCart || guestCart.items.length === 0) {
      return userCart;
    }

    for (const item of guestCart.items) {
      const existing = userCart.items.find((userItem) => userItem.productId === item.productId);
      const mergedQuantity = (existing?.quantity ?? 0) + item.quantity;

      await validateProductAvailability(item.productId, mergedQuantity);

      if (existing) {
        await prisma.cartItem.updateMany({
          where: {
            cartId: userCart.id,
            productId: item.productId,
          },
          data: {
            quantity: mergedQuantity,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: guestCart.id,
      },
    });

    await prisma.cart.delete({
      where: { id: guestCart.id },
    });

    await touchCart(userCart.id);

    const mergedCart = await fetchCart({ userId: input.userId });
    return serializeCart(mergedCart) as CartSummary;
  },

  async getCartItemCount(input: GetOrCreateCartInput): Promise<number> {
    const cart = await fetchCart(input);

    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  async hasCartItems(input: GetOrCreateCartInput): Promise<boolean> {
    const count = await this.getCartItemCount(input);
    return count > 0;
  },

  async assertCartIsValidForCheckout(input: GetOrCreateCartInput): Promise<CartSummary> {
    const cart = await fetchCart(input);

    if (!cart || cart.items.length === 0) {
      throw new Error('Your cart is empty.');
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new Error(`${item.product.name} is no longer available.`);
      }

      const availableInventory =
        typeof item.product.inventoryQuantity === 'number'
          ? item.product.inventoryQuantity
          : 0;

      if (availableInventory < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.product.name}.`);
      }
    }

    return serializeCart(cart) as CartSummary;
  },
};

export async function getOrCreateCart(input: GetOrCreateCartInput) {
  return cartService.getOrCreateCart(input);
}

export async function getCart(input: GetOrCreateCartInput) {
  return cartService.getCart(input);
}

export async function addItemToCart(input: AddToCartInput) {
  return cartService.addItem(input);
}

export async function updateCartItem(input: UpdateCartItemInput) {
  return cartService.updateItem(input);
}

export async function removeItemFromCart(input: RemoveCartItemInput) {
  return cartService.removeItem(input);
}

export async function clearCart(input: GetOrCreateCartInput) {
  return cartService.clearCart(input);
}

export async function mergeGuestCartIntoUserCart(input: MergeCartInput) {
  return cartService.mergeGuestCartIntoUserCart(input);
}