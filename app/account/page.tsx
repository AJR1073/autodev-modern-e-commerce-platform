import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function getStatusVariant(status: string) {
  switch (status.toUpperCase()) {
    case 'DELIVERED':
      return 'default';
    case 'SHIPPED':
      return 'secondary';
    case 'PROCESSING':
      return 'secondary';
    case 'PENDING':
      return 'outline';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/?auth=login&redirect=/account');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      orders: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
    },
  });

  const orders = dbUser?.orders ?? [];
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const totalItemsPurchased = orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  const activeOrders = orders.filter((order) =>
    ['PENDING', 'PROCESSING', 'SHIPPED'].includes(String(order.status).toUpperCase())
  ).length;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">My Account</p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {dbUser?.name || user.name || 'Customer'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review your profile details, monitor recent orders, and continue shopping with confidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button asChild>
            <Link href="/cart">View Cart</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Account email</CardDescription>
            <CardTitle className="text-base">{dbUser?.email || user.email || 'Not available'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Used for order updates, confirmations, and account access.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders placed</CardDescription>
            <CardTitle className="text-3xl">{orders.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent completed and in-progress purchases.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total spent</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalSpent)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Based on your most recent order history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active orders</CardDescription>
            <CardTitle className="text-3xl">{activeOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{totalItemsPurchased} items purchased across your recent orders.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Track the latest activity for your purchases.</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <h2 className="text-lg font-semibold">No orders yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  When you place your first order, it will appear here with status updates and item details.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/products">Browse products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <div key={order.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                            <Badge variant={getStatusVariant(String(order.status))}>{String(order.status)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Placed on {formatDate(order.createdAt)} • {itemCount} item{itemCount === 1 ? '' : 's'}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-sm text-muted-foreground">Order total</p>
                          <p className="text-lg font-semibold">{formatCurrency(Number(order.totalAmount || 0))}</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.product?.name || 'Product unavailable'}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty {item.quantity}
                                {item.product?.sku ? ` • SKU ${item.product.sku}` : ''}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-medium">
                              {formatCurrency(Number(item.unitPrice || item.product?.price || 0))}
                            </p>
                          </div>
                        ))}

                        {order.items.length > 3 ? (
                          <p className="text-sm text-muted-foreground">
                            +{order.items.length - 3} more item{order.items.length - 3 === 1 ? '' : 's'} in this order
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile summary</CardTitle>
              <CardDescription>Your account and shopping details at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full name</p>
                <p className="font-medium">{dbUser?.name || user.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email address</p>
                <p className="font-medium">{dbUser?.email || user.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Member since</p>
                <p className="font-medium">
                  {dbUser?.createdAt ? formatDate(dbUser.createdAt) : 'Recently joined'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need help?</CardTitle>
              <CardDescription>Support for orders, shipping, and product questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                If you need assistance with an order, checkout issue, or delivery update, our support team is ready to help.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline">
                  <Link href="/products">Shop best sellers</Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start px-0">
                  <a href="mailto:support@example.com">support@example.com</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}