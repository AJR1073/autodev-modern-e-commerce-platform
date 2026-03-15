'use client';

import Link from 'next/link';
import { ShoppingBag, X } from 'lucide-react';

import { useCart } from '@/hooks/use-cart';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { CartItemRow } from '@/components/cart/cart-item-row';
import { CartSummary } from '@/components/cart/cart-summary';

type CartSheetProps = {
  className?: string;
};

export function CartSheet({ className }: CartSheetProps) {
  const { items, totals, isLoading, isOpen, setIsOpen, itemCount, clearCart } = useCart();

  const hasItems = items.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={className}
          aria-label={`Shopping cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold text-primary-foreground">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          </div>
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="space-y-2 pr-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-left">Your cart</SheetTitle>
              <SheetDescription className="text-left">
                Review your items before checkout.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8" aria-label="Close cart">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-hidden">
          {!hasItems ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Your cart is empty</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Add products to your cart to continue shopping and proceed to checkout.
              </p>
              <SheetClose asChild>
                <Button asChild className="mt-6">
                  <Link href="/products">Browse products</Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-4 pb-4">
                <p className="text-sm text-muted-foreground">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void clearCart()}
                  disabled={isLoading}
                >
                  Clear cart
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {items.map((item) => (
                    <CartItemRow key={item.productId} item={item} />
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4 border-t pt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal || 0)}</span>
                </div>

                <Separator />

                <CartSummary compact />

                <div className="grid gap-3">
                  <SheetClose asChild>
                    <Button asChild size="lg" className="w-full">
                      <Link href="/checkout">Proceed to checkout</Link>
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button asChild variant="outline" size="lg" className="w-full">
                      <Link href="/cart">View full cart</Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}