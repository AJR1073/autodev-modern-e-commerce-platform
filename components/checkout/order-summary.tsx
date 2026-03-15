import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";

type OrderSummaryItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
  slug?: string | null;
};

interface OrderSummaryProps {
  items: OrderSummaryItem[];
  subtotal?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  total?: number;
  currency?: string;
  title?: string;
  showCheckoutNotice?: boolean;
}

function calculateSubtotal(items: OrderSummaryItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function OrderSummary({
  items,
  subtotal,
  shipping = 0,
  tax = 0,
  discount = 0,
  total,
  currency = "USD",
  title = "Order summary",
  showCheckoutNotice = true,
}: OrderSummaryProps) {
  const computedSubtotal = subtotal ?? calculateSubtotal(items);
  const computedTotal = total ?? Math.max(computedSubtotal + shipping + tax - discount, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-600">
          {itemCount} {itemCount === 1 ? "item" : "items"} in your order
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Your cart is empty.{" "}
              <Link href="/products" className="font-medium text-slate-900 underline underline-offset-4">
                Continue shopping
              </Link>
              .
            </div>
          ) : (
            items.map((item) => {
              const lineTotal = item.price * item.quantity;

              return (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}`}
                        className="line-clamp-2 text-sm font-medium text-slate-900 transition-colors hover:text-slate-700"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.name}</p>
                    )}

                    <p className="mt-1 text-sm text-slate-500">
                      Qty {item.quantity} × {formatCurrency(item.price, currency)}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-medium text-slate-900">
                    {formatCurrency(lineTotal, currency)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <Separator />

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">{formatCurrency(computedSubtotal, currency)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Shipping</span>
            <span className="font-medium text-slate-900">
              {shipping === 0 ? "Free" : formatCurrency(shipping, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Estimated tax</span>
            <span className="font-medium text-slate-900">{formatCurrency(tax, currency)}</span>
          </div>

          {discount > 0 ? (
            <div className="flex items-center justify-between text-emerald-700">
              <span>Discount</span>
              <span className="font-medium">- {formatCurrency(discount, currency)}</span>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-base font-semibold text-slate-900">
            {formatCurrency(computedTotal, currency)}
          </span>
        </div>

        {showCheckoutNotice ? (
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Final shipping and tax may update after you enter your delivery details and payment method.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default OrderSummary;