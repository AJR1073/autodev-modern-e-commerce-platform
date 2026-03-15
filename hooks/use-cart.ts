"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CartItem = {
  productId: string;
  quantity: number;
  product?: {
    id?: string;
    name?: string;
    slug?: string;
    price?: number;
    images?: string[];
    image?: string | null;
    stock?: number;
    sku?: string;
  };
};

type CartResponse = {
  items?: CartItem[];
  subtotal?: number;
  totalItems?: number;
};

type AddToCartInput = {
  productId: string;
  quantity?: number;
};

type UpdateCartInput = {
  productId: string;
  quantity: number;
};

type UseCartReturn = {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  addItem: (input: AddToCartInput) => Promise<boolean>;
  updateItem: (input: UpdateCartInput) => Promise<boolean>;
  removeItem: (productId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
};

const FALLBACK_CART_KEY = "cart";

function normalizeCart(data: CartResponse | null | undefined) {
  const items = Array.isArray(data?.items) ? data!.items : [];
  const subtotal =
    typeof data?.subtotal === "number"
      ? data.subtotal
      : items.reduce((sum, item) => {
          const price = typeof item.product?.price === "number" ? item.product.price : 0;
          return sum + price * item.quantity;
        }, 0);

  const totalItems =
    typeof data?.totalItems === "number"
      ? data.totalItems
      : items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    subtotal,
    totalItems,
  };
}

function readLocalFallbackCart(): CartResponse {
  if (typeof window === "undefined") {
    return { items: [], subtotal: 0, totalItems: 0 };
  }

  try {
    const raw = window.localStorage.getItem(FALLBACK_CART_KEY);
    if (!raw) {
      return { items: [], subtotal: 0, totalItems: 0 };
    }

    const parsed = JSON.parse(raw) as CartResponse;
    return normalizeCart(parsed);
  } catch {
    return { items: [], subtotal: 0, totalItems: 0 };
  }
}

function writeLocalFallbackCart(cart: CartResponse) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FALLBACK_CART_KEY, JSON.stringify(normalizeCart(cart)));
  } catch {
    // noop
  }
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCartState = useCallback((data: CartResponse | null | undefined) => {
    const normalized = normalizeCart(data);
    setItems(normalized.items);
    setSubtotal(normalized.subtotal);
    setTotalItems(normalized.totalItems);
    writeLocalFallbackCart(normalized);
  }, []);

  const refreshCart = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/cart", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load cart.");
      }

      const data = (await response.json()) as CartResponse;
      applyCartState(data);
    } catch (err) {
      const fallback = readLocalFallbackCart();
      applyCartState(fallback);
      setError(err instanceof Error ? err.message : "Failed to load cart.");
    } finally {
      setIsLoading(false);
    }
  }, [applyCartState]);

  useEffect(() => {
    const fallback = readLocalFallbackCart();
    if (fallback.items && fallback.items.length > 0) {
      applyCartState(fallback);
      setIsLoading(false);
    }

    void refreshCart();
  }, [applyCartState, refreshCart]);

  const addItem = useCallback(
    async ({ productId, quantity = 1 }: AddToCartInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            quantity,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add item to cart.");
        }

        const data = (await response.json()) as CartResponse;
        applyCartState(data);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add item to cart.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [applyCartState]
  );

  const updateItem = useCallback(
    async ({ productId, quantity }: UpdateCartInput) => {
      setIsMutating(true);
      setError(null);

      try {
        if (quantity <= 0) {
          return await (async () => removeItem(productId))();
        }

        const response = await fetch(`/api/cart/${encodeURIComponent(productId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update cart item.");
        }

        const data = (await response.json()) as CartResponse;
        applyCartState(data);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update cart item.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [applyCartState]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setIsMutating(true);
      setError(null);

      try {
        const response = await fetch(`/api/cart/${encodeURIComponent(productId)}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove item from cart.");
        }

        const data = (await response.json()) as CartResponse;
        applyCartState(data);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove item from cart.");
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [applyCartState]
  );

  const clearCart = useCallback(async () => {
    setIsMutating(true);
    setError(null);

    try {
      const currentItems = [...items];

      const results = await Promise.all(
        currentItems.map((item) =>
          fetch(`/api/cart/${encodeURIComponent(item.productId)}`, {
            method: "DELETE",
          })
        )
      );

      const hasFailure = results.some((response) => !response.ok);

      if (hasFailure) {
        throw new Error("Failed to clear cart.");
      }

      applyCartState({ items: [], subtotal: 0, totalItems: 0 });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cart.");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [applyCartState, items]);

  const isInCart = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  );

  const getItemQuantity = useCallback(
    (productId: string) => items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items]
  );

  return useMemo(
    () => ({
      items,
      subtotal,
      totalItems,
      isLoading,
      isMutating,
      error,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      isInCart,
      getItemQuantity,
    }),
    [
      items,
      subtotal,
      totalItems,
      isLoading,
      isMutating,
      error,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      isInCart,
      getItemQuantity,
    ]
  );
}

export default useCart;