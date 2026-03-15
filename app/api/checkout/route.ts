import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { withRateLimit } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/session';

type CheckoutItemInput = {
  productId?: string;
  quantity?: number;
};

type CheckoutPayload = {
  items?: CheckoutItemInput[];
  email?: string;
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  successUrl?: string;
  cancelUrl?: string;
  notes?: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

function isValidQuantity(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function normalizeUrl(url?: string, fallbackPath = '/') {
  if (!url) return `${APP_URL}${fallbackPath}`;

  try {
    const parsed = new URL(url, APP_URL);
    return parsed.toString();
  } catch {
    return `${APP_URL}${fallbackPath}`;
  }
}

function formatAddressForMetadata(
  address?: CheckoutPayload['shippingAddress'] | CheckoutPayload['billingAddress']
) {
  if (!address) return '';

  return [
    address.line1 || '',
    address.line2 || '',
    address.city || '',
    address.state || '',
    address.postalCode || '',
    address.country || '',
  ]
    .filter(Boolean)
    .join(', ');
}

async function handler(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as CheckoutPayload | null;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'A non-empty items array is required.' },
        { status: 400 }
      );
    }

    const sanitizedItems = body.items
      .map((item) => ({
        productId: typeof item?.productId === 'string' ? item.productId.trim() : '',
        quantity: Number(item?.quantity || 0),
      }))
      .filter((item) => item.productId && isValidQuantity(item.quantity));

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid checkout items were provided.' },
        { status: 400 }
      );
    }

    const uniqueProductIds = [...new Set(sanitizedItems.map((item) => item.productId))];

    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        sku: true,
        images: true,
        inventory: true,
        isActive: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        { error: 'One or more products could not be found.' },
        { status: 404 }
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of sanitizedItems) {
      const product = productMap.get(item.productId);

      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `Product ${item.productId} is unavailable.` },
          { status: 400 }
        );
      }

      const inventoryValue =
        typeof product.inventory === 'number' ? product.inventory : Number(product.inventory || 0);

      if (inventoryValue < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient inventory for ${product.name}. Requested ${item.quantity}, available ${inventoryValue}.`,
          },
          { status: 409 }
        );
      }
    }

    const sessionUser = await getSessionUser().catch(() => null);
    const customerEmail =
      (typeof body.email === 'string' && body.email.trim()) ||
      (typeof body.customerEmail === 'string' && body.customerEmail.trim()) ||
      sessionUser?.email ||
      undefined;

    const currency = DEFAULT_CURRENCY;
    let orderTotal = new Prisma.Decimal(0);

    const lineItems = sanitizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitAmountDecimal =
        product.price instanceof Prisma.Decimal
          ? product.price
          : new Prisma.Decimal(product.price || 0);

      orderTotal = orderTotal.plus(unitAmountDecimal.mul(item.quantity));

      const imageUrl =
        Array.isArray(product.images) && product.images.length > 0
          ? String(product.images[0])
          : undefined;

      const unitAmountInCents = Math.round(Number(unitAmountDecimal) * 100);

      return {
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: unitAmountInCents,
          product_data: {
            name: product.name,
            description: product.sku ? `SKU: ${product.sku}` : undefined,
            images: imageUrl ? [imageUrl] : undefined,
            metadata: {
              productId: product.id,
              slug: product.slug,
              sku: product.sku || '',
            },
          },
        },
      };
    });

    if (!stripe) {
      return NextResponse.json(
        {
          error: 'Stripe is not configured.',
        },
        { status: 500 }
      );
    }

    const successUrl = normalizeUrl(body.successUrl, '/checkout/success');
    const cancelUrl = normalizeUrl(body.cancelUrl, '/checkout');

    const shippingMetadata = formatAddressForMetadata(body.shippingAddress);
    const billingMetadata = formatAddressForMetadata(body.billingAddress);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: {
        source: 'web_checkout',
        userId: sessionUser?.id || '',
        customerEmail: customerEmail || '',
        customerName: body.customerName || '',
        shippingAddress: shippingMetadata,
        billingAddress: billingMetadata,
        notes: body.notes || '',
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: sessionUser?.id || null,
        email: customerEmail || '',
        status: 'PENDING',
        total: orderTotal,
        shippingAddress: body.shippingAddress ? JSON.stringify(body.shippingAddress) : null,
        billingAddress: body.billingAddress ? JSON.stringify(body.billingAddress) : null,
        notes: body.notes || null,
        stripeCheckoutSessionId: checkoutSession.id,
        items: {
          create: sanitizedItems.map((item) => {
            const product = productMap.get(item.productId)!;
            const unitPrice =
              product.price instanceof Prisma.Decimal
                ? product.price
                : new Prisma.Decimal(product.price || 0);

            return {
              productId: product.id,
              quantity: item.quantity,
              unitPrice,
              totalPrice: unitPrice.mul(item.quantity),
            };
          }),
        },
      },
      select: {
        id: true,
        status: true,
        total: true,
        stripeCheckoutSessionId: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        checkoutSessionId: checkoutSession.id,
        url: checkoutSession.url,
        orderId: order.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Checkout session creation failed:', error);

    return NextResponse.json(
      {
        error: 'Unable to create checkout session.',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler);