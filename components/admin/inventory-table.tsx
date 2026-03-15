'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, Loader2, PackageSearch, Search } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

type InventoryRow = {
  productId: string;
  productName: string;
  slug?: string | null;
  sku: string;
  category?: string | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  inStock?: boolean;
  updatedAt?: string | Date | null;
};

type InventoryTableProps = {
  items: InventoryRow[];
};

function getStockState(stock: number, threshold: number) {
  if (stock <= 0) {
    return {
      label: 'Out of stock',
      tone: 'destructive' as const,
    };
  }

  if (stock <= threshold) {
    return {
      label: 'Low stock',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'In stock',
    tone: 'success' as const,
  };
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const state = getStockState(stock, threshold);

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium',
        state.tone === 'destructive' &&
          'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
        state.tone === 'warning' &&
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
        state.tone === 'success' &&
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
      )}
    >
      {state.label}
    </Badge>
  );
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [rows, setRows] = useState(items);
  const [query, setQuery] = useState('');
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return rows;
    }

    return rows.filter((item) => {
      const haystack = [
        item.productName,
        item.sku,
        item.category ?? '',
        item.slug ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [rows, query]);

  const summary = useMemo(() => {
    const total = rows.length;
    const outOfStock = rows.filter((item) => item.stock <= 0).length;
    const lowStock = rows.filter(
      (item) => item.stock > 0 && item.stock <= item.lowStockThreshold
    ).length;

    return { total, outOfStock, lowStock };
  }, [rows]);

  const updateInventory = async (
    productId: string,
    currentStock: number,
    lowStockThreshold: number,
    nextStock: number
  ) => {
    if (nextStock < 0) return;

    setError(null);
    setPendingMap((prev) => ({ ...prev, [productId]: true }));

    const previousRows = rows;

    setRows((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              stock: nextStock,
              inStock: nextStock > 0,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/inventory/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock: nextStock,
          lowStockThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update inventory.');
      }
    } catch (err) {
      setRows(previousRows);
      setError(err instanceof Error ? err.message : 'Failed to update inventory.');
    } finally {
      setPendingMap((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleAdjust = (
    productId: string,
    currentStock: number,
    lowStockThreshold: number,
    delta: number
  ) => {
    startTransition(() => {
      void updateInventory(
        productId,
        currentStock,
        lowStockThreshold,
        currentStock + delta
      );
    });
  };

  const handleStockInput = (
    productId: string,
    currentStock: number,
    lowStockThreshold: number,
    value: string
  ) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    if (parsed === currentStock) {
      return;
    }

    startTransition(() => {
      void updateInventory(productId, currentStock, lowStockThreshold, parsed);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Tracked products</p>
          <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Low stock alerts</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {summary.lowStock}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Out of stock</p>
          <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
            {summary.outOfStock}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Inventory management</h2>
            <p className="text-sm text-muted-foreground">
              Monitor stock levels and quickly adjust quantities.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by product, SKU, or category"
              className="pl-9"
              aria-label="Search inventory"
            />
          </div>
        </div>

        {error ? (
          <div className="border-b bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <PackageSearch className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">No inventory items found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your search to find products faster.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((item) => {
                const busy = !!pendingMap[item.productId];
                const status = getStockState(item.stock, item.lowStockThreshold);

                return (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{item.productName}</p>
                        {item.slug ? (
                          <p className="text-xs text-muted-foreground">/{item.slug}</p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>

                    <TableCell>
                      {item.category ? (
                        <span className="text-sm">{item.category}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Uncategorized</span>
                      )}
                    </TableCell>

                    <TableCell>{formatCurrency(item.price)}</TableCell>

                    <TableCell>
                      <StockBadge stock={item.stock} threshold={item.lowStockThreshold} />
                    </TableCell>

                    <TableCell>{item.lowStockThreshold}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={item.stock}
                          onBlur={(event) =>
                            handleStockInput(
                              item.productId,
                              item.stock,
                              item.lowStockThreshold,
                              event.target.value
                            )
                          }
                          className={cn(
                            'h-9 w-24',
                            status.tone === 'destructive' &&
                              'border-red-300 focus-visible:ring-red-300 dark:border-red-800',
                            status.tone === 'warning' &&
                              'border-amber-300 focus-visible:ring-amber-300 dark:border-amber-800'
                          )}
                          aria-label={`Stock quantity for ${item.productName}`}
                          disabled={busy}
                        />
                        {busy || isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.updatedAt)}
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleAdjust(
                              item.productId,
                              item.stock,
                              item.lowStockThreshold,
                              -1
                            )
                          }
                          disabled={busy || item.stock <= 0}
                        >
                          -1
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            handleAdjust(
                              item.productId,
                              item.stock,
                              item.lowStockThreshold,
                              1
                            )
                          }
                          disabled={busy}
                        >
                          +1
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
    </div>
  );
}

export default InventoryTable;