'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, Search } from 'lucide-react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderTableItem = {
  id: string;
  orderNumber?: string | null;
  status: string;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  customer?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
  email?: string | null;
  items?: Array<{
    id?: string;
    quantity?: number | null;
  }> | null;
};

type OrdersTableProps = {
  orders: OrderTableItem[];
  className?: string;
};

const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FULFILLED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

function normalizeCurrencyValue(value?: number | string | null) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getCustomerName(order: OrderTableItem) {
  return (
    order.customer?.name ||
    order.user?.name ||
    order.customer?.email ||
    order.user?.email ||
    order.email ||
    'Guest customer'
  );
}

function getCustomerEmail(order: OrderTableItem) {
  return order.customer?.email || order.user?.email || order.email || '—';
}

function getItemCount(order: OrderTableItem) {
  if (!order.items?.length) return 0;
  return order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function OrdersTable({ orders, className }: OrdersTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.orderNumber,
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
        getCustomerName(order),
        getCustomerEmail(order),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [orders, query]);

  const handleStatusChange = async (orderId: string, status: string) => {
    setPendingOrderId(orderId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error('Failed to update order status');
        }

        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setPendingOrderId(null);
      }
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-600">
            Monitor recent purchases, payment state, and fulfillment progress.
          </p>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order, customer, or status"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="w-[180px]">Update Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <p className="text-sm font-medium text-slate-900">
                        No orders found
                      </p>
                      <p className="text-sm text-slate-500">
                        Try a different search term or check back after new
                        purchases are placed.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const orderLabel = order.orderNumber || order.id.slice(0, 8);
                  const customerName = getCustomerName(order);
                  const customerEmail = getCustomerEmail(order);
                  const itemCount = getItemCount(order);
                  const total = normalizeCurrencyValue(
                    order.total ?? order.subtotal,
                  );
                  const rowPending =
                    isPending && pendingOrderId && pendingOrderId === order.id;

                  return (
                    <TableRow key={order.id} className="align-top">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">
                            #{orderLabel}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {order.id}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">
                            {customerName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {customerEmail}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={order.status} />
                          {order.fulfillmentStatus ? (
                            <Badge
                              variant="secondary"
                              className="w-fit bg-slate-100 text-slate-700"
                            >
                              {order.fulfillmentStatus}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        {order.paymentStatus ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'w-fit',
                              order.paymentStatus.toLowerCase() === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.paymentStatus.toLowerCase() ===
                                    'failed'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700',
                            )}
                          >
                            {order.paymentStatus}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">
                          {itemCount}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">
                          {formatCurrency(total)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          value={order.status}
                          onChange={(event) =>
                            handleStatusChange(order.id, event.target.value)
                          }
                          disabled={rowPending}
                          aria-label={`Update status for order ${orderLabel}`}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rowPending ? (
                            <span className="inline-flex items-center text-xs text-slate-500">
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              Saving
                            </span>
                          ) : null}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
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
    </div>
  );
}

export default OrdersTable;