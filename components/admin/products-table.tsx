'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Trash2, Plus, Package, Eye, EyeOff } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  isActive: boolean;
  imageUrl?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type ProductsTableProps = {
  products: AdminProduct[];
};

type SortKey = 'name' | 'sku' | 'price' | 'stock' | 'category' | 'status';

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.slug.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.category?.name?.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && product.isActive) ||
        (statusFilter === 'inactive' && !product.isActive);

      return matchesQuery && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortKey) {
        case 'sku':
          return a.sku.localeCompare(b.sku) * direction;
        case 'price':
          return (a.price - b.price) * direction;
        case 'stock':
          return (a.stock - b.stock) * direction;
        case 'category':
          return (a.category?.name || '').localeCompare(b.category?.name || '') * direction;
        case 'status':
          return (Number(a.isActive) - Number(b.isActive)) * direction;
        case 'name':
        default:
          return a.name.localeCompare(b.name) * direction;
      }
    });

    return sorted;
  }, [products, query, statusFilter, sortKey, sortDirection]);

  const counts = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc.total += 1;
        if (product.isActive) acc.active += 1;
        else acc.inactive += 1;
        if (product.stock <= 5) acc.lowStock += 1;
        return acc;
      },
      { total: 0, active: 0, inactive: 0, lowStock: 0 }
    );
  }, [products]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) return;

    setPendingId(productId);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        window.alert(data?.error || 'Failed to delete product.');
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      window.alert('Something went wrong while deleting the product.');
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleStatus = async (product: AdminProduct) => {
    setPendingId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        window.alert(data?.error || 'Failed to update product status.');
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      window.alert('Something went wrong while updating the product.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total products</p>
          <p className="mt-2 text-2xl font-semibold">{counts.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{counts.active}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-slate-500">{counts.inactive}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Low stock</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{counts.lowStock}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Products</h2>
            <p className="text-sm text-muted-foreground">
              Manage catalog visibility, pricing, and inventory status.
            </p>
          </div>

          <Button onClick={() => router.push('/admin/products/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </div>

        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, SKU, slug, or category..."
              className="pl-9"
              aria-label="Search products"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactive
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Product"
                  active={sortKey === 'name'}
                  direction={sortDirection}
                  onClick={() => handleSort('name')}
                />
                <SortableHead
                  label="SKU"
                  active={sortKey === 'sku'}
                  direction={sortDirection}
                  onClick={() => handleSort('sku')}
                  className="w-[120px]"
                />
                <SortableHead
                  label="Category"
                  active={sortKey === 'category'}
                  direction={sortDirection}
                  onClick={() => handleSort('category')}
                />
                <SortableHead
                  label="Price"
                  active={sortKey === 'price'}
                  direction={sortDirection}
                  onClick={() => handleSort('price')}
                  className="text-right"
                />
                <SortableHead
                  label="Stock"
                  active={sortKey === 'stock'}
                  direction={sortDirection}
                  onClick={() => handleSort('stock')}
                  className="text-right"
                />
                <SortableHead
                  label="Status"
                  active={sortKey === 'status'}
                  direction={sortDirection}
                  onClick={() => handleSort('status')}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-muted p-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">No products found</p>
                        <p className="text-sm text-muted-foreground">
                          Try changing your search or filter criteria.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const rowPending = pendingId === product.id || isPending;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border bg-muted">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium">{product.name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              /products/{product.slug}
                            </p>
                            {product.description ? (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {product.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs uppercase text-muted-foreground">
                        {product.sku}
                      </TableCell>

                      <TableCell>
                        {product.category?.name ? (
                          <Badge variant="secondary">{product.category.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Uncategorized</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="space-y-0.5">
                          <p className="font-medium">{formatCurrency(product.price)}</p>
                          {typeof product.compareAtPrice === 'number' &&
                          product.compareAtPrice > product.price ? (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.compareAtPrice)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-medium',
                            product.stock <= 5 ? 'text-amber-600' : 'text-foreground'
                          )}
                        >
                          {product.stock}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Draft'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/products/${product.slug}`)}
                            aria-label={`View ${product.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/products/${product.id}`)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={rowPending}
                            onClick={() => handleToggleStatus(product)}
                            aria-label={`${product.isActive ? 'Hide' : 'Show'} ${product.name}`}
                          >
                            {product.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={rowPending}
                            onClick={() => handleDelete(product.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <p>
            Showing <span className="font-medium text-foreground">{filteredProducts.length}</span> of{' '}
            <span className="font-medium text-foreground">{products.length}</span> products
          </p>
        </div>
      </div>
    </div>
  );
}

type SortableHeadProps = {
  label: string;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
};

function SortableHead({
  label,
  active = false,
  direction = 'asc',
  onClick,
  className,
}: SortableHeadProps) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground transition hover:text-foreground"
      >
        <span>{label}</span>
        <span className={cn('text-xs', active ? 'opacity-100' : 'opacity-40')}>
          {direction === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </TableHead>
  );
}