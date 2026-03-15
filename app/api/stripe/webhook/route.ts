import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendOrderConfirmationEmail } from '@/services/notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckoutMetadata = {
  orderId?: string;
  customerEmail?: string;
  customerName?: string;
};

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

function extractMetadata(session: Stripe.Checkout.Session): CheckoutMetadata {
  const metadata = session.metadata || {};
  return {
    orderId: metadata.orderId || undefined,
    customerEmail: metadata.customerEmail || undefined,
    customerName: metadata.customerName || undefined,
  };
}

async function markOrderPaid(session: Stripe.Checkout.Session) {
  const { orderId, customerEmail, customerName } = extractMetadata(session);

  if (!orderId) {
    console.warn('Stripe webhook: missing orderId in session metadata', {
      sessionId: session.id,
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
    },
  });

  if (!order) {
    console.warn('Stripe webhook: order not found', { orderId, sessionId: session.id });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  const alreadyPaid =
    order.paymentStatus === 'PAID' ||
    order.status === 'PROCESSING' ||
    order.status === 'CONFIRMED';

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'PAID',
      status: alreadyPaid ? order.status : 'PROCESSING',
      stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId || undefined,
      stripeSessionId: session.id || order.stripeSessionId || undefined,
      customerEmail:
        session.customer_details?.email ||
        session.customer_email ||
        customerEmail ||
        order.customerEmail,
      customerName: session.customer_details?.name || customerName || order.customerName,
      paidAt: order.paidAt || new Date(),
    },
  });

  if (order.paymentStatus !== 'PAID') {
    try {
      await sendOrderConfirmationEmail({
        orderId: order.id,
      });
    } catch (error) {
      console.error('Stripe webhook: failed to send order confirmation email', error);
    }
  }
}

async function markOrderPaymentFailed(invoiceOrSession: {
  metadata?: Record<string, string>;
  id?: string;
}) {
  const orderId = invoiceOrSession.metadata?.orderId;

  if (!orderId) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'FAILED',
      status: order.status === 'PENDING' ? 'CANCELLED' : order.status,
    },
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret is not configured.' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to verify webhook signature.';
    console.error('Stripe webhook signature verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (
          session.payment_status === 'paid' ||
          session.status === 'complete' ||
          session.mode === 'payment'
        ) {
          await markOrderPaid(session);
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await markOrderPaid(session);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await markOrderPaymentFailed(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (order && order.paymentStatus !== 'PAID') {
            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'PAID',
                status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
                stripePaymentIntentId: paymentIntent.id,
                paidAt: order.paidAt || new Date(),
              },
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (order) {
            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'FAILED',
                stripePaymentIntentId: paymentIntent.id,
              },
            });
          }
        }
        break;
      }

      default: {
        console.log(`Stripe webhook: unhandled event type ${event.type}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 }
    );
  }
}