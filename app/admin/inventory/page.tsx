import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SearchParams = {
  q?: string;
  status?: string;
};

const LOW_STOCK_THRESHOLD = 10;

function getStockStatus(quantity: number) {
  if (quantity <= 0) {
    return {
      label: 'Out of stock',
      className: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return {
      label: 'Low stock',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'In stock',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
}

function getCoverageDays(quantity: number, reserved: number) {
  const available = Math.max(quantity - reserved, 0);

  if (available === 0) {
    return '0 days';
  }

  if (available <= LOW_STOCK_THRESHOLD) {
    return '3-7 days';
  }

  if (available <= 25) {
    return '1-2 weeks';
  }

  return '2+ weeks';
}

export const metadata = {
  title: 'Admin Inventory',
  description: 'Monitor stock levels, availability, and low inventory alerts.',
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const query = searchParams?.q?.trim() || '';
  const statusFilter = searchParams?.status?.trim() || 'all';

  const products = await prisma.product.findMany({
    where: {
      OR: query
        ? [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: [{ inventoryQuantity: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      inventoryQuantity: true,
      updatedAt: true,
      category: {
        select: {
          name: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
          order: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  const inventoryRows = products
    .map((product) => {
      const reserved = product.orderItems.reduce((sum, item) => {
        const activeStatuses = ['PENDING', 'PROCESSING', 'PAID'];
        if (activeStatuses.includes(String(item.order.status))) {
          return sum + item.quantity;
        }

        return sum;
      }, 0);

      const available = Math.max(product.inventoryQuantity - reserved, 0);
      const status =
        product.inventoryQuantity <= 0
          ? 'out'
          : product.inventoryQuantity <= LOW_STOCK_THRESHOLD
            ? 'low'
            : 'healthy';

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        category: product.category?.name || 'Uncategorized',
        price: product.price,
        onHand: product.inventoryQuantity,
        reserved,
        available,
        updatedAt: product.updatedAt,
        status,
      };
    })
    .filter((product) => {
      if (statusFilter === 'all') return true;
      return product.status === statusFilter;
    });

  const totals = inventoryRows.reduce(
    (acc, item) => {
      acc.onHand += item.onHand;
      acc.reserved += item.reserved;
      acc.available += item.available;

      if (item.status === 'out') acc.out += 1;
      if (item.status === 'low') acc.low += 1;
      if (item.status === 'healthy') acc.healthy += 1;

      return acc;
    },
    {
      onHand: 0,
      reserved: 0,
      available: 0,
      out: 0,
      low: 0,
      healthy: 0,
    }
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Track stock health, identify low inventory, and review reserved units tied to active
            orders.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <form className="flex flex-col gap-3 sm:flex-row" action="/admin/inventory" method="GET">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by product or SKU"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:w-64"
              aria-label="Search inventory"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
              aria-label="Filter inventory by status"
            >
              <option value="all">All stock states</option>
              <option value="healthy">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total SKUs</CardDescription>
            <CardTitle className="text-2xl">{inventoryRows.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Products matching current filters.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Units on hand</CardDescription>
            <CardTitle className="text-2xl">{totals.onHand}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Physical inventory recorded in catalog.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Available units</CardDescription>
            <CardTitle className="text-2xl">{totals.available}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Sellable stock after reserved quantities.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Reserved units</CardDescription>
            <CardTitle className="text-2xl">{totals.reserved}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Allocated to active, unpaid, or processing orders.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Attention needed</CardDescription>
            <CardTitle className="text-2xl">{totals.low + totals.out}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {totals.out} out of stock, {totals.low} low stock.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Stock overview</CardTitle>
          <CardDescription>
            Review inventory position across the catalog and jump to product management when an
            update is needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inventoryRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <h2 className="text-lg font-medium text-slate-900">No inventory records found</h2>
              <p className="mt-2 text-sm text-slate-600">
                Try a different search term or clear the stock filter to view more products.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryRows.map((item) => {
                    const badge = getStockStatus(item.available);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="min-w-[220px]">
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatCurrency(Number(item.price))}</TableCell>
                        <TableCell>{item.onHand}</TableCell>
                        <TableCell>{item.reserved}</TableCell>
                        <TableCell className="font-medium text-slate-900">{item.available}</TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>{getCoverageDays(item.available, 0)}</TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }).format(item.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/products?edit=${item.id}`}>Update stock</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Inventory health</CardTitle>
            <CardDescription>Quick distribution of stock status for filtered items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-sm font-medium text-emerald-800">In stock</span>
              <span className="text-lg font-semibold text-emerald-900">{totals.healthy}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">Low stock</span>
              <span className="text-lg font-semibold text-amber-900">{totals.low}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm font-medium text-red-800">Out of stock</span>
              <span className="text-lg font-semibold text-red-900">{totals.out}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
            <CardDescription>
              Focus operations where stock risk is highest to prevent missed sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="rounded-lg border border-slate-200 p-4">
                Replenish products with fewer than {LOW_STOCK_THRESHOLD + 1} units available to
                reduce stockout risk.
              </li>
              <li className="rounded-lg border border-slate-200 p-4">
                Review reserved quantities regularly to ensure pending orders do not block sellable
                inventory longer than necessary.
              </li>
              <li className="rounded-lg border border-slate-200 p-4">
                Coordinate merchandising and purchasing for items with repeated low-stock patterns
                and strong demand.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}