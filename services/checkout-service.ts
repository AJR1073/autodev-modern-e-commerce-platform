import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { checkoutSchema } from '@/lib/validators/checkout';
import { InventoryService } from '@/services/inventory-service';
import { NotificationService } from '@/services/notification-service';
import { OrderService } from '@/services/order-service';

type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

type CheckoutCustomerInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type CheckoutAddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type CreateCheckoutInput = {
  userId?: string | null;
  email?: string;
  customer?: CheckoutCustomerInput;
  items: CheckoutItemInput[];
  shippingAddress?: CheckoutAddressInput;
  billingAddress?: CheckoutAddressInput;
  successUrl?: string;
  cancelUrl?: string;
  currency?: string;
  notes?: string;
  metadata?: Record<string, string>;
};

export type CheckoutPreview = {
  currency: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    sku: string;
    image: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export type CheckoutSessionResult = {
  sessionId: string;
  url: string | null;
  orderId: string;
  paymentIntentId?: string | null;
};

type ProductForCheckout = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: Prisma.Decimal | number;
  image?: string | null;
  images?: string[] | null;
  inventory?: Array<{
    quantity: number;
    reservedQuantity?: number | null;
  }>;
};

const DEFAULT_CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || 'usd').toLowerCase();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof (value as Prisma.Decimal).toNumber === 'function') {
    return (value as Prisma.Decimal).toNumber();
  }
  return Number(value) || 0;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toStripeAmount(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

function normalizeEmail(input?: string | null): string {
  return (input || '').trim().toLowerCase();
}

function getProductImage(product: ProductForCheckout): string | null {
  if (product.image) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0] || null;
  }
  return null;
}

function getAvailableQuantity(product: ProductForCheckout): number {
  const inventory = product.inventory?.[0];
  if (!inventory) return 0;
  const quantity = inventory.quantity || 0;
  const reserved = inventory.reservedQuantity || 0;
  return Math.max(0, quantity - reserved);
}

export class CheckoutService {
  static async getCheckoutPreview(input: CreateCheckoutInput): Promise<CheckoutPreview> {
    const parsed = checkoutSchema.safeParse(input);

    if (!parsed.success) {
      throw new Error('Invalid checkout data.');
    }

    const items = parsed.data.items || [];
    if (!items.length) {
      throw new Error('Your cart is empty.');
    }

    const productIds = [...new Set(items.map((item) => item.productId))];

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        inventory: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error('One or more products are unavailable.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error('A requested product could not be found.');
      }

      const availableQuantity = getAvailableQuantity(product);
      if (item.quantity > availableQuantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      const unitPrice = roundCurrency(toNumber(product.price));
      const lineTotal = roundCurrency(unitPrice * item.quantity);

      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        image: getProductImage(product),
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    );

    const shippingAmount = this.calculateShipping(subtotal, parsed.data.shippingAddress);
    const taxAmount = this.calculateTax(subtotal, shippingAmount, parsed.data.shippingAddress);
    const total = roundCurrency(subtotal + shippingAmount + taxAmount);

    return {
      currency: (parsed.data.currency || DEFAULT_CURRENCY).toLowerCase(),
      subtotal,
      shippingAmount,
      taxAmount,
      total,
      items: normalizedItems,
    };
  }

  static async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const preview = await this.getCheckoutPreview(input);
    const parsed = checkoutSchema.safeParse(input);

    if (!parsed.success) {
      throw new Error('Invalid checkout data.');
    }

    const customerEmail = normalizeEmail(
      parsed.data.customer?.email || parsed.data.email,
    );

    if (!customerEmail) {
      throw new Error('A valid customer email is required.');
    }

    const successUrl =
      parsed.data.successUrl ||
      `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = parsed.data.cancelUrl || `${APP_URL}/checkout`;

    const productIds = preview.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { inventory: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    return prisma.$transaction(async (tx) => {
      for (const item of parsed.data.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error('One or more products are unavailable.');
        }

        const availableQuantity = getAvailableQuantity(product);
        if (item.quantity > availableQuantity) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }

        await InventoryService.reserveStock(tx, item.productId, item.quantity);
      }

      const orderData = {
        userId: parsed.data.userId || null,
        email: customerEmail,
        status: 'PENDING',
        currency: preview.currency,
        subtotalAmount: preview.subtotal,
        shippingAmount: preview.shippingAmount,
        taxAmount: preview.taxAmount,
        totalAmount: preview.total,
        notes: parsed.data.notes || null,
        shippingAddress: parsed.data.shippingAddress
          ? JSON.stringify(parsed.data.shippingAddress)
          : null,
        billingAddress: parsed.data.billingAddress
          ? JSON.stringify(parsed.data.billingAddress)
          : parsed.data.shippingAddress
            ? JSON.stringify(parsed.data.shippingAddress)
            : null,
      };

      const order = await tx.order.create({
        data: {
          ...(orderData as never),
          items: {
            create: preview.items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.lineTotal,
            })),
          },
        },
      });

      const stripeSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        payment_method_types: ['card'],
        line_items: [
          ...preview.items.map((item) => ({
            quantity: item.quantity,
            price_data: {
              currency: preview.currency,
              unit_amount: toStripeAmount(item.unitPrice),
              product_data: {
                name: item.name,
                images: item.image ? [item.image] : [],
                metadata: {
                  productId: item.productId,
                  slug: item.slug,
                  sku: item.sku,
                },
              },
            },
          })),
          ...(preview.shippingAmount > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: preview.currency,
                    unit_amount: toStripeAmount(preview.shippingAmount),
                    product_data: {
                      name: 'Shipping',
                    },
                  },
                },
              ]
            : []),
          ...(preview.taxAmount > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: preview.currency,
                    unit_amount: toStripeAmount(preview.taxAmount),
                    product_data: {
                      name: 'Tax',
                    },
                  },
                },
              ]
            : []),
        ],
        metadata: {
          orderId: order.id,
          email: customerEmail,
          ...(parsed.data.metadata || {}),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          stripeCheckoutSessionId: stripeSession.id,
          stripePaymentIntentId:
            typeof stripeSession.payment_intent === 'string'
              ? stripeSession.payment_intent
              : null,
        } as never,
      });

      return {
        sessionId: stripeSession.id,
        url: stripeSession.url,
        orderId: order.id,
        paymentIntentId:
          typeof stripeSession.payment_intent === 'string'
            ? stripeSession.payment_intent
            : null,
      };
    });
  }

  static async confirmCheckoutSession(sessionId: string) {
    if (!sessionId) {
      throw new Error('Checkout session ID is required.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      throw new Error('No order metadata was found for this checkout session.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error('Order not found.');
    }

    if (order.status === 'PAID' || order.status === 'PROCESSING') {
      return order;
    }

    const isPaid =
      session.payment_status === 'paid' ||
      (typeof session.payment_intent !== 'string' &&
        session.payment_intent?.status === 'succeeded');

    if (!isPaid) {
      throw new Error('Payment has not been completed.');
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await InventoryService.commitReservedStock(tx, item.productId, item.quantity);
      }

      const nextOrder = await OrderService.updateOrderStatus(
        tx,
        order.id,
        'PAID',
        {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id || null,
        },
      );

      return nextOrder;
    });

    await NotificationService.sendOrderConfirmation({
      orderId: updatedOrder.id,
    });

    return updatedOrder;
  }

  static async handleFailedCheckoutSession(sessionId: string) {
    if (!sessionId) {
      throw new Error('Checkout session ID is required.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return null;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    if (order.status === 'CANCELLED' || order.status === 'FAILED') {
      return order;
    }

    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await InventoryService.releaseReservedStock(tx, item.productId, item.quantity);
      }

      return OrderService.updateOrderStatus(tx, order.id, 'FAILED', {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
      });
    });
  }

  static calculateShipping(subtotal: number, address?: CheckoutAddressInput): number {
    if (subtotal <= 0) return 0;
    if (subtotal >= 100) return 0;

    const country = (address?.country || 'US').toUpperCase();

    if (country !== 'US') {
      return 18;
    }

    return 8.99;
  }

  static calculateTax(
    subtotal: number,
    shippingAmount: number,
    address?: CheckoutAddressInput,
  ): number {
    const country = (address?.country || 'US').toUpperCase();
    if (country !== 'US') return 0;

    const taxableAmount = subtotal + shippingAmount;
    return roundCurrency(taxableAmount * 0.08);
  }
}

export const checkoutService = CheckoutService;