import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProductsTable } from '@/components/admin/products-table';

type AdminProductsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    stock?: string;
  };
};

const getStatusLabel = (isActive: boolean) => (isActive ? 'Active' : 'Draft');

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const query = searchParams?.q?.trim() || '';
  const status = searchParams?.status?.trim() || 'all';
  const stock = searchParams?.stock?.trim() || 'all';

  const products = await prisma.product.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {},
        status === 'active' ? { isActive: true } : {},
        status === 'draft' ? { isActive: false } : {},
        stock === 'in-stock' ? { inventory: { gt: 0 } } : {},
        stock === 'low-stock' ? { inventory: { gt: 0, lte: 10 } } : {},
        stock === 'out-of-stock' ? { inventory: { lte: 0 } } : {},
      ],
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const draftProducts = products.filter((product) => !product.isActive).length;
  const outOfStockProducts = products.filter((product) => product.inventory <= 0).length;
  const lowStockProducts = products.filter((product) => product.inventory > 0 && product.inventory <= 10).length;
  const totalInventoryValue = products.reduce((sum, product) => {
    const price = typeof product.price === 'object' && 'toNumber' in product.price ? product.price.toNumber() : Number(product.price);
    return sum + price * Math.max(product.inventory, 0);
  }, 0);

  const tableProducts = products.map((product) => ({
    ...product,
    statusLabel: getStatusLabel(product.isActive),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-600">
            Manage your product catalog, availability, pricing, and inventory from one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Link href="/products">View storefront</Link>
          </Button>
          <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        </div>
      </div>

      <section
        aria-label="Product overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total products</CardDescription>
            <CardTitle className="text-2xl">{totalProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">All products matching the current filters.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{activeProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Live in catalog</Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl">{draftProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              Hidden from storefront
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Low / no stock</CardDescription>
            <CardTitle className="text-2xl">
              {lowStockProducts + outOfStockProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {lowStockProducts} low stock, {outOfStockProducts} out of stock.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Inventory value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalInventoryValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Estimated value based on current stock and price.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Catalog management</CardTitle>
          <CardDescription>
            Search and filter products to review pricing, stock levels, and publication status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-4" action="/admin/products" method="get">
            <div className="md:col-span-2">
              <label htmlFor="q" className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <Input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Search by name, SKU, slug, or description"
                className="border-slate-300 bg-white"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label htmlFor="stock" className="mb-2 block text-sm font-medium text-slate-700">
                Stock
              </label>
              <select
                id="stock"
                name="stock"
                defaultValue={stock}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All stock levels</option>
                <option value="in-stock">In stock</option>
                <option value="low-stock">Low stock</option>
                <option value="out-of-stock">Out of stock</option>
              </select>
            </div>

            <div className="md:col-span-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900">{products.length}</span> product
                {products.length === 1 ? '' : 's'}
                {query ? (
                  <>
                    {' '}
                    for <span className="font-medium text-slate-900">“{query}”</span>
                  </>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
                  Apply filters
                </Button>
                <Button asChild type="button" variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/admin/products">Reset</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Product list</CardTitle>
            <CardDescription>
              Monitor product details, stock status, and merchandising readiness.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <ProductsTable products={tableProducts as never} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No products found</h2>
              <p className="mt-2 text-sm text-slate-600">
                Try adjusting your filters or add a new product to start building your catalog.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Link href="/admin/products">Clear filters</Link>
                </Button>
                <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
                  <Link href="/admin/products/new">Add product</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}