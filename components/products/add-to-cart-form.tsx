'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AddToCartFormProps = {
  productId: string;
  productName: string;
  price: number;
  inventory?: number | null;
  className?: string;
  minQuantity?: number;
};

export function AddToCartForm({
  productId,
  productName,
  price,
  inventory,
  className,
  minQuantity = 1,
}: AddToCartFormProps) {
  const router = useRouter();
  const { addItem, isLoading } = useCart();

  const maxInventory =
    typeof inventory === 'number' && Number.isFinite(inventory) ? Math.max(0, inventory) : null;

  const initialQuantity = useMemo(() => {
    if (maxInventory === 0) return 0;
    return Math.max(minQuantity, 1);
  }, [maxInventory, minQuantity]);

  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const isOutOfStock = maxInventory === 0;
  const allowedMax = maxInventory ?? 99;

  const handleQuantityChange = (value: string) => {
    setError('');
    setSuccessMessage('');

    if (value === '') {
      setQuantity(minQuantity);
      return;
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      setQuantity(minQuantity);
      return;
    }

    const nextValue = Math.min(Math.max(parsed, minQuantity), allowedMax);
    setQuantity(nextValue);
  };

  const increment = () => {
    setError('');
    setSuccessMessage('');
    setQuantity((current) => Math.min(current + 1, allowedMax));
  };

  const decrement = () => {
    setError('');
    setSuccessMessage('');
    setQuantity((current) => Math.max(current - 1, minQuantity));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isOutOfStock) {
      setError('This product is currently out of stock.');
      return;
    }

    if (quantity < minQuantity) {
      setError(`Please select at least ${minQuantity} item${minQuantity > 1 ? 's' : ''}.`);
      return;
    }

    if (maxInventory !== null && quantity > maxInventory) {
      setError(`Only ${maxInventory} item${maxInventory === 1 ? '' : 's'} available.`);
      return;
    }

    try {
      await addItem({
        productId,
        quantity,
        price,
        name: productName,
      });

      setSuccessMessage(`${productName} added to cart.`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to add this product to your cart. Please try again.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor={`quantity-${productId}`}>Quantity</Label>
        <div className="flex w-full max-w-xs items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrement}
            disabled={isLoading || isOutOfStock || quantity <= minQuantity}
            aria-label="Decrease quantity"
          >
            -
          </Button>

          <Input
            id={`quantity-${productId}`}
            type="number"
            inputMode="numeric"
            min={minQuantity}
            max={allowedMax}
            step={1}
            value={quantity}
            onChange={(event) => handleQuantityChange(event.target.value)}
            disabled={isLoading || isOutOfStock}
            aria-describedby={
              error
                ? `add-to-cart-error-${productId}`
                : successMessage
                  ? `add-to-cart-success-${productId}`
                  : maxInventory !== null
                    ? `add-to-cart-stock-${productId}`
                    : undefined
            }
            className="text-center"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={increment}
            disabled={isLoading || isOutOfStock || quantity >= allowedMax}
            aria-label="Increase quantity"
          >
            +
          </Button>
        </div>

        {maxInventory !== null && !isOutOfStock ? (
          <p id={`add-to-cart-stock-${productId}`} className="text-sm text-muted-foreground">
            {maxInventory} item{maxInventory === 1 ? '' : 's'} available
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || isOutOfStock}>
        {isOutOfStock ? 'Out of stock' : isLoading ? 'Adding...' : 'Add to cart'}
      </Button>

      {error ? (
        <p
          id={`add-to-cart-error-${productId}`}
          role="alert"
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p
          id={`add-to-cart-success-${productId}`}
          aria-live="polite"
          className="text-sm font-medium text-green-600"
        >
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}

export default AddToCartForm;