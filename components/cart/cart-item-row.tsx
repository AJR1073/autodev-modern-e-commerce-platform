'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';

type CartItemRowProps = {
  item: {
    productId: string;
    name: string;
    slug: string;
    price: number;
    quantity: number;
    image?: string | null;
    sku?: string | null;
  };
  className?: string;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function CartItemRow({ item, className }: CartItemRowProps) {
  const { updateItemQuantity, removeItem, isLoading } = useCart();

  const lineTotal = item.price * item.quantity;
  const imageSrc =
    item.image && item.image.trim().length > 0
      ? item.image
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      removeItem(item.productId);
      return;
    }

    updateItemQuantity(item.productId, item.quantity - 1);
  };

  const handleIncrease = () => {
    updateItemQuantity(item.productId, item.quantity + 1);
  };

  const handleRemove = () => {
    removeItem(item.productId);
  };

  return (
    <div
      className={cn(
        'flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <Link
        href={`/products/${item.slug}`}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28"
        aria-label={`View ${item.name}`}
      >
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 96px, 112px"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/products/${item.slug}`}
                className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-700 sm:text-base"
              >
                {item.name}
              </Link>
              {item.sku ? (
                <p className="mt-1 text-xs text-slate-500">SKU: {item.sku}</p>
              ) : null}
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 sm:text-base">
                {formatPrice(lineTotal)}
              </p>
              {item.quantity > 1 ? (
                <p className="text-xs text-slate-500">
                  {formatPrice(item.price)} each
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center rounded-lg border border-slate-200"
            aria-label={`Quantity controls for ${item.name}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-none rounded-l-lg"
              onClick={handleDecrease}
              disabled={isLoading}
              aria-label={
                item.quantity <= 1
                  ? `Remove ${item.name} from cart`
                  : `Decrease quantity of ${item.name}`
              }
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div
              className="flex h-10 min-w-[3rem] items-center justify-center border-x border-slate-200 px-3 text-sm font-medium text-slate-900"
              aria-live="polite"
              aria-atomic="true"
            >
              {item.quantity}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-none rounded-r-lg"
              onClick={handleIncrease}
              disabled={isLoading}
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-10 px-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleRemove}
            disabled={isLoading}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CartItemRow;