import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeApiVersion: Stripe.LatestApiVersion = '2024-06-20';

export const stripe =
  stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: stripeApiVersion,
        typescript: true,
      })
    : null;

export function getStripeClient() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.');
  }

  return stripe;
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey);
}

export function toStripeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

export function fromStripeAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return amount / 100;
}

export type CheckoutLineItemInput = {
  name: string;
  description?: string | null;
  image?: string | null;
  quantity: number;
  unitAmount: number;
  metadata?: Record<string, string>;
};

export function buildStripeLineItems(items: CheckoutLineItemInput[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items
    .filter((item) => item.quantity > 0 && item.unitAmount >= 0)
    .map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeAmount(item.unitAmount),
        product_data: {
          name: item.name,
          description: item.description || undefined,
          images: item.image ? [item.image] : undefined,
          metadata: item.metadata,
        },
      },
    }));
}

export type CreateCheckoutSessionInput = {
  lineItems: CheckoutLineItemInput[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  metadata?: Record<string, string>;
  shippingAmount?: number;
  taxAmount?: number;
};

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const client = getStripeClient();

  const lineItems = buildStripeLineItems(input.lineItems);

  if (input.shippingAmount && input.shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeAmount(input.shippingAmount),
        product_data: {
          name: 'Shipping',
        },
      },
    });
  }

  if (input.taxAmount && input.taxAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeAmount(input.taxAmount),
        product_data: {
          name: 'Tax',
        },
      },
    });
  }

  return client.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail || undefined,
    metadata: input.metadata,
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB'],
    },
    allow_promotion_codes: true,
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  const client = getStripeClient();
  return client.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent'],
  });
}

export async function constructStripeEvent(payload: string | Buffer, signature: string) {
  const client = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  return client.webhooks.constructEvent(payload, signature, webhookSecret);
}