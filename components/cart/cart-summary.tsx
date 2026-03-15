'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ShoppingBag, ShieldCheck, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';

type CartSummaryProps = {
  className?: string;
  showCheckoutButton?: boolean;
  showContinueShopping?: boolean;
  checkoutHref?: string;
};

export function CartSummary({
  className,
  showCheckoutButton = true,
  showContinueShopping = true,
  checkoutHref = '/checkout',
}: CartSummaryProps) {
  const { items } = useCart();

  const summary = useMemo(() => {
    const subtotal = items.reduce((total, item) => {
      const price = Number(item.price ?? 0);
      return total + price * item.quantity;
    }, 0);

    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const qualifiesForFreeShipping = subtotal >= 100;
    const shipping = itemCount === 0 ? 0 : qualifiesForFreeShipping ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    return {
      subtotal,
      itemCount,
      shipping,
      tax,
      total,
      qualifiesForFreeShipping,
      amountToFreeShipping: Math.max(0, 100 - subtotal),
    };
  }, [items]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const isEmpty = summary.itemCount === 0;

  return (
    <Card className={cn('sticky top-24', className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShoppingBag className="h-5 w-5" />
          Order summary
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {summary.itemCount === 0
            ? 'Your cart is currently empty.'
            : `${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'} in your cart.`}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isEmpty && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                {summary.qualifiesForFreeShipping ? (
                  <p className="font-medium text-foreground">You qualify for free shipping.</p>
                ) : (
                  <p className="font-medium text-foreground">
                    Add {formatCurrency(summary.amountToFreeShipping)} more to unlock free shipping.
                  </p>
                )}
                <p className="text-muted-foreground">
                  Free shipping is available on orders over {formatCurrency(100)}.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {summary.shipping === 0 ? 'Free' : formatCurrency(summary.shipping)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated tax</span>
            <span className="font-medium">{formatCurrency(summary.tax)}</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-base">
            <span className="font-semibold">Estimated total</span>
            <span className="font-semibold">{formatCurrency(summary.total)}</span>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">Secure checkout</p>
              <p className="text-muted-foreground">
                Your payment details are processed securely during checkout.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {showCheckoutButton && (
            <Button asChild className="w-full" size="lg" disabled={isEmpty}>
              <Link href={checkoutHref} aria-disabled={isEmpty}>
                Proceed to checkout
              </Link>
            </Button>
          )}

          {showContinueShopping && (
            <Button asChild className="w-full" variant="outline">
              <Link href="/products">Continue shopping</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CartSummary;