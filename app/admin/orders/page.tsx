import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { OrdersTable } from '@/components/admin/orders-table';

type SearchParams = {
  q?: string;
  status?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  switch (status.toUpperCase()) {
    case 'DELIVERED':
      return 'default';
    case 'SHIPPED':
      return 'secondary';
    case 'PROCESSING':
      return 'outline';
    case 'PENDING':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const query = searchParams?.q?.trim() || '';
  const status = searchParams?.status?.trim() || '';

  const where = {
    ...(query
      ? {
          OR: [
            {
              id: {
                contains: query,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: query,
                mode: 'insensitive' as const,
              },
            },
            {
              customerName: {
                contains: query,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {}),
    ...(status && status !== 'ALL'
      ? {
          status: status.toUpperCase(),
        }
      : {}),
  };

  const [orders, totalOrders, pendingOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders] =
    await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]);

  const grossRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const averageOrderValue = orders.length ? grossRevenue / orders.length : 0;

  const recentStatuses = [
    { label: 'Pending', value: pendingOrders, tone: getStatusTone('PENDING') },
    { label: 'Processing', value: processingOrders, tone: getStatusTone('PROCESSING') },
    { label: 'Shipped', value: shippedOrders, tone: getStatusTone('SHIPPED') },
    { label: 'Delivered', value: deliveredOrders, tone: getStatusTone('DELIVERED') },
    { label: 'Cancelled', value: cancelledOrders, tone: getStatusTone('CANCELLED') },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            Operations
          </Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
            <p className="text-sm text-slate-600">
              Monitor purchases, review fulfillment progress, and keep customers informed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/api/orders">Export API</Link>
          </Button>
          <Button asChild>
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total orders</CardDescription>
            <CardTitle className="text-3xl">{totalOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">All-time orders placed across the storefront.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visible revenue</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(grossRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Revenue from the currently filtered results.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average order value</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(averageOrderValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Average spend for the orders shown below.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered results</CardDescription>
            <CardTitle className="text-3xl">{orders.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Orders matching your current search and status filters.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter orders</CardTitle>
          <CardDescription>Search by order ID, customer name, or email. Filter by fulfillment status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr),220px,auto]">
            <div className="space-y-2">
              <label htmlFor="q" className="text-sm font-medium text-slate-700">
                Search
              </label>
              <Input
                id="q"
                name="q"
                placeholder="Order ID, customer name, or email"
                defaultValue={query}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status || 'ALL'}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-offset-white transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="w-full md:w-auto">
                Apply
              </Button>
              <Button asChild type="button" variant="outline" className="w-full md:w-auto">
                <Link href="/admin/orders">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
        <Card>
          <CardHeader>
            <CardTitle>Order management</CardTitle>
            <CardDescription>
              Review customer orders, inspect line items, and update operational workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersTable orders={orders} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status overview</CardTitle>
              <CardDescription>High-level breakdown of order pipeline health.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentStatuses.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.tone as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {item.label}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest orders requiring visibility from the fulfillment team.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-600">No orders match the selected filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order, index) => (
                    <div key={order.id}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {order.customerName || order.email || 'Guest customer'}
                            </p>
                            <p className="text-xs text-slate-500">#{order.id.slice(0, 8)}</p>
                          </div>
                          <Badge variant={getStatusTone(order.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(order.createdAt)}</span>
                          <span>{formatCurrency(Number(order.totalAmount || 0))}</span>
                        </div>
                      </div>
                      {index < Math.min(orders.length, 5) - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}