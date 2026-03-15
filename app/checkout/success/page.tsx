import Link from 'next/link';
import { CheckCircle2, Package, Receipt, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SuccessPageProps = {
  searchParams?: {
    orderId?: string;
    session_id?: string;
  };
};

export const metadata = {
  title: 'Order confirmed | Checkout success',
  description: 'Your order has been placed successfully.',
};

function getReferenceLabel(orderId?: string, sessionId?: string) {
  if (orderId) {
    return {
      label: 'Order reference',
      value: orderId,
    };
  }

  if (sessionId) {
    return {
      label: 'Payment session',
      value: sessionId,
    };
  }

  return null;
}

export default function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const orderId = searchParams?.orderId;
  const sessionId = searchParams?.session_id;
  const reference = getReferenceLabel(orderId, sessionId);

  return (
    <div className="bg-slate-50">
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border-emerald-200 shadow-sm">
            <div className="bg-emerald-50 px-6 py-8 sm:px-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                    Payment successful
                  </p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    Thank you for your order
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    We&apos;ve received your order and started processing it. A confirmation email will be sent shortly with your purchase details.
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="space-y-8 px-6 py-8 sm:px-8">
              {reference ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-500">{reference.label}</p>
                  <p className="mt-1 break-all text-base font-semibold text-slate-900">
                    {reference.value}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Receipt className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Order confirmation</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    You&apos;ll receive an email summary with billing and order details.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Package className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Processing & shipping</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Our team will prepare your items and share tracking updates once shipped.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">Continue shopping</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Explore more products, categories, and new arrivals anytime.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-base font-semibold text-slate-900">What happens next?</h2>
                <ol className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>1. Your payment is confirmed and your order is recorded.</li>
                  <li>2. Inventory is updated and fulfillment begins.</li>
                  <li>3. You&apos;ll receive shipping updates when your package is on the way.</li>
                </ol>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="sm:w-auto">
                  <Link href="/products">Continue shopping</Link>
                </Button>
                <Button asChild variant="outline" className="sm:w-auto">
                  <Link href="/account">View account</Link>
                </Button>
                <Button asChild variant="ghost" className="sm:w-auto">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-slate-500">
            Need help with your order? Contact our support team and include your reference number for faster assistance.
          </p>
        </div>
      </div>
    </div>
  );
}