import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Shopping Cart',
  description: 'Review the items in your cart and continue to secure checkout.',
};

const cartItems = [
  {
    id: '1',
    name: 'Minimalist Leather Backpack',
    slug: 'minimalist-leather-backpack',
    quantity: 1,
    price: 129.99,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    variant: 'Cognac',
  },
  {
    id: '2',
    name: 'Everyday Ceramic Mug',
    slug: 'everyday-ceramic-mug',
    quantity: 2,
    price: 18.5,
    image:
      'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?auto=format&fit=crop&w=800&q=80',
    variant: 'Matte White',
  },
  {
    id: '3',
    name: 'Organic Cotton Throw Blanket',
    slug: 'organic-cotton-throw-blanket',
    quantity: 1,
    price: 64,
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    variant: 'Sand',
  },
];

const shippingEstimate = 12;
const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
const total = subtotal + shippingEstimate;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function CartPage() {
  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Cart</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Your shopping cart
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
            Review your selected items, update quantities at checkout, and complete your purchase
            securely.
          </p>
        </div>

        {cartItems.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Your cart is empty</CardTitle>
              <CardDescription>
                Looks like you have not added any items yet. Browse the catalog to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/products">Continue shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.75fr_1fr] lg:items-start">
            <section aria-labelledby="cart-items-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  id="cart-items-heading"
                  className="text-lg font-semibold text-slate-900 sm:text-xl"
                >
                  Items ({cartItems.reduce((count, item) => count + item.quantity, 0)})
                </h2>
                <Button asChild variant="ghost" className="text-slate-600">
                  <Link href="/products">Add more items</Link>
                </Button>
              </div>

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                        <Link
                          href={`/products/${item.slug}`}
                          className="block overflow-hidden rounded-xl bg-slate-100 sm:w-36 sm:flex-none"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-48 w-full object-cover sm:h-36"
                          />
                        </Link>

                        <div className="flex flex-1 flex-col justify-between gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <Link
                                href={`/products/${item.slug}`}
                                className="text-base font-semibold text-slate-900 transition hover:text-slate-700"
                              >
                                {item.name}
                              </Link>
                              <p className="text-sm text-slate-500">Variant: {item.variant}</p>
                              <p className="text-sm text-slate-500">Quantity: {item.quantity}</p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-base font-semibold text-slate-900">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatCurrency(item.price)} each
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/products/${item.slug}`}>View product</Link>
                            </Button>
                            <Button variant="ghost" size="sm" className="text-slate-500">
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <aside aria-labelledby="order-summary-heading" className="lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle id="order-summary-heading">Order summary</CardTitle>
                  <CardDescription>
                    Shipping and taxes are finalized during checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated shipping</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(shippingEstimate)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-slate-900">Estimated total</span>
                        <span className="text-base font-semibold text-slate-900">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link href="/checkout">Proceed to checkout</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/products">Continue shopping</Link>
                    </Button>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Secure checkout</p>
                    <p className="mt-1">
                      Payments are processed securely with Stripe. You can review your order before
                      placing it.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}