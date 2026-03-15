import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default async function AdminDashboardPage() {
  const [
    productCount,
    orderCount,
    categoryCount,
    recentOrders,
    lowStockProducts,
    inventoryItems,
    paidOrdersAggregate,
  ] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
        user: true,
      },
    }).catch(() => []),
    prisma.product.findMany({
      where: {
        inventory: {
          quantity: {
            lte: 10,
          },
        },
      },
      take: 5,
      orderBy: {
        inventory: {
          quantity: 'asc',
        },
      },
      include: {
        inventory: true,
        category: true,
      },
    }).catch(() => []),
    prisma.inventory.findMany({
      include: {
        product: true,
      },
    }).catch(() => []),
    prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: {
          in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
        },
      },
    }).catch(() => ({ _sum: { totalAmount: 0 } })),
  ]);

  const totalInventoryUnits = inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const outOfStockCount = inventoryItems.filter((item) => (item.quantity || 0) <= 0).length;
  const lowStockCount = inventoryItems.filter((item) => (item.quantity || 0) > 0 && (item.quantity || 0) <= 10).length;
  const totalRevenue = Number(paidOrdersAggregate?._sum?.totalAmount || 0);

  const statCards = [
    {
      title: 'Products',
      value: productCount,
      description: 'Active catalog items',
      href: '/admin/products',
    },
    {
      title: 'Orders',
      value: orderCount,
      description: 'Total customer orders',
      href: '/admin/orders',
    },
    {
      title: 'Categories',
      value: categoryCount,
      description: 'Browseable product groups',
      href: '/products',
    },
    {
      title: 'Revenue',
      value: formatCurrency(totalRevenue),
      description: 'Paid and fulfilled pipeline',
      href: '/admin/orders',
    },
    {
      title: 'Inventory Units',
      value: totalInventoryUnits,
      description: 'Units currently on hand',
      href: '/admin/inventory',
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      description: 'Items needing replenishment',
      href: '/admin/inventory',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor sales, inventory health, and recent order activity across the store.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Manage orders
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Manage products
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="block">
            <Card className="h-full border-slate-200 transition hover:border-slate-300 hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <CardTitle className="text-3xl font-bold text-slate-900">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Latest customer activity and order pipeline updates.</CardDescription>
            </div>
            <Link href="/admin/orders" className="text-sm font-medium text-slate-900 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-600">No orders found yet. Orders will appear here once customers check out.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">Order #{String(order.id).slice(0, 8)}</p>
                          <Badge variant="secondary" className="capitalize">
                            {String(order.status || 'pending').toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {order.user?.name || order.user?.email || 'Guest customer'} • {itemCount} item{itemCount === 1 ? '' : 's'}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(Number(order.totalAmount || 0))}
                        </p>
                        <Link
                          href="/admin/orders"
                          className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Inventory alerts</CardTitle>
              <CardDescription>Products that need immediate replenishment attention.</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-6">
                  <p className="text-sm font-medium text-emerald-800">Inventory looks healthy.</p>
                  <p className="mt-1 text-sm text-emerald-700">No products are currently at or below the low-stock threshold.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((product) => {
                    const quantity = product.inventory?.quantity || 0;
                    const isOut = quantity <= 0;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">
                            {product.category?.name || 'Uncategorized'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={isOut ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                            {isOut ? 'Out of stock' : `${quantity} left`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  <Link href="/admin/inventory" className="inline-block text-sm font-medium text-slate-900 hover:underline">
                    Open inventory management
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Operational summary</CardTitle>
              <CardDescription>Quick view of catalog and fulfillment health.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-600">Out of stock products</dt>
                  <dd className="text-sm font-semibold text-slate-900">{outOfStockCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-600">Low stock products</dt>
                  <dd className="text-sm font-semibold text-slate-900">{lowStockCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-600">Total inventory units</dt>
                  <dd className="text-sm font-semibold text-slate-900">{totalInventoryUnits}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-600">Catalog categories</dt>
                  <dd className="text-sm font-semibold text-slate-900">{categoryCount}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}