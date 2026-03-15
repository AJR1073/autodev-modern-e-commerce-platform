import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CheckoutForm } from '@/components/checkout/checkout-form';
import { OrderSummary } from '@/components/checkout/order-summary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { prisma } from '@/lib/prisma';

type CartItemData = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: unknown;
    images: string[];
    inventory?: {
      quantity: number;
    } | null;
  };
};

function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

async function getCartItems(): Promise<CartItemData[]> {
  try {
    const cartItems = await prisma.cartItem.findMany({
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return cartItems as CartItemData[];
  } catch {
    return [];
  }
}

export const metadata = {
  title: 'Checkout',
  description: 'Review your order, enter shipping information, and complete your purchase securely.',
};

export default async function CheckoutPage() {
  const cartItems = await getCartItems();

  if (!cartItems.length) {
    redirect('/cart');
  }

  const normalizedItems = cartItems.map((item) => {
    const unitPrice = parsePrice(item.product.price);
    const lineTotal = unitPrice * item.quantity;
    const availableQuantity = item.product.inventory?.quantity ?? 0;

    return {
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images?.[0] || '/placeholder-product.jpg',
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      availableQuantity,
    };
  });

  const subtotal = normalizedItems.reduce((total, item) => total + item.lineTotal, 0);
  const shipping = subtotal >= 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Secure checkout</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Complete your order</h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Review your items, provide your delivery details, and place your order with confidence.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Customer and shipping details</CardTitle>
              <CardDescription>
                Enter your contact information and delivery address. Payment is processed securely at order placement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckoutForm />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Why customers trust this checkout</CardTitle>
              <CardDescription>Built for a fast, accessible, and transparent buying experience.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Secure payments</h3>
                <p className="mt-2 text-sm text-slate-600">Encrypted checkout flow designed to support trusted payment processing.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Transparent pricing</h3>
                <p className="mt-2 text-sm text-slate-600">Taxes and shipping are clearly summarized before you place your order.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Fast fulfillment</h3>
                <p className="mt-2 text-sm text-slate-600">Inventory-aware ordering helps keep availability and delivery expectations accurate.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <OrderSummary />

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Order snapshot</CardTitle>
              <CardDescription>A quick overview of the items currently in your cart.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-4" aria-label="Checkout items">
                {normalizedItems.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        className="line-clamp-2 text-sm font-medium text-slate-900 transition hover:text-slate-700"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>Qty {item.quantity}</span>
                        <span>{formatCurrency(item.unitPrice)} each</span>
                        <span>{item.availableQuantity} in stock</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-medium text-slate-900">{formatCurrency(item.lineTotal)}</div>
                  </li>
                ))}
              </ul>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimated tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Estimated total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                {shipping === 0 ? (
                  <p>You qualify for free shipping on this order.</p>
                ) : (
                  <p>Add {formatCurrency(Math.max(0, 100 - subtotal))} more to unlock free standard shipping.</p>
                )}
              </div>

              <p className="text-xs leading-5 text-slate-500">
                By continuing, you agree to our store policies and understand that final payment authorization and order confirmation occur after checkout submission.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}