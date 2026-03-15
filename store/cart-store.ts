'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartItem = {
  productId: string;
  slug?: string;
  name: string;
  sku?: string;
  image?: string | null;
  price: number;
  quantity: number;
  maxQuantity?: number | null;
};

type AddCartItemInput = Omit<CartItem, 'quantity'> & {
  quantity?: number;
};

type CartStore = {
  items: CartItem[];
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  addItem: (item: AddCartItemInput) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  getItem: (productId: string) => CartItem | undefined;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotalQuantity: () => number;
};

const STORAGE_KEY = 'modern-ecommerce-cart';

function clampQuantity(quantity: number, maxQuantity?: number | null) {
  const normalized = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const minClamped = Math.max(1, normalized);

  if (typeof maxQuantity === 'number' && maxQuantity > 0) {
    return Math.min(minClamped, maxQuantity);
  }

  return minClamped;
}

function normalizePrice(price: number) {
  if (!Number.isFinite(price)) {
    return 0;
  }

  return Math.max(0, price);
}

function normalizeItem(item: CartItem): CartItem {
  return {
    ...item,
    image: item.image ?? null,
    price: normalizePrice(item.price),
    quantity: clampQuantity(item.quantity, item.maxQuantity),
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: value }),

      addItem: (item) => {
        const quantity = clampQuantity(item.quantity ?? 1, item.maxQuantity);
        const normalizedPrice = normalizePrice(item.price);

        set((state) => {
          const existingItem = state.items.find(
            (cartItem) => cartItem.productId === item.productId
          );

          if (existingItem) {
            const updatedItems = state.items.map((cartItem) => {
              if (cartItem.productId !== item.productId) {
                return cartItem;
              }

              const mergedMaxQuantity =
                typeof item.maxQuantity === 'number'
                  ? item.maxQuantity
                  : cartItem.maxQuantity;

              return normalizeItem({
                ...cartItem,
                ...item,
                price: normalizedPrice,
                maxQuantity: mergedMaxQuantity,
                quantity: clampQuantity(
                  cartItem.quantity + quantity,
                  mergedMaxQuantity
                ),
              });
            });

            return { items: updatedItems };
          }

          const nextItem: CartItem = normalizeItem({
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            sku: item.sku,
            image: item.image ?? null,
            price: normalizedPrice,
            quantity,
            maxQuantity: item.maxQuantity,
          });

          return { items: [...state.items, nextItem] };
        });
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? normalizeItem({
                    ...item,
                    quantity: clampQuantity(quantity, item.maxQuantity),
                  })
                : item
            ),
          };
        }),

      incrementItem: (productId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? normalizeItem({
                  ...item,
                  quantity: clampQuantity(item.quantity + 1, item.maxQuantity),
                })
              : item
          ),
        })),

      decrementItem: (productId) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: item.quantity - 1,
                  }
                : item
            )
            .filter((item) => item.quantity > 0)
            .map(normalizeItem),
        })),

      clearCart: () => set({ items: [] }),

      setItems: (items) =>
        set({
          items: items
            .filter((item) => item.quantity > 0)
            .map(normalizeItem),
        }),

      getItem: (productId) =>
        get().items.find((item) => item.productId === productId),

      getItemCount: () => get().items.length,

      getSubtotal: () =>
        get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        ),

      getTotalQuantity: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export const selectCartItems = (state: CartStore) => state.items;
export const selectCartHydrated = (state: CartStore) => state.isHydrated;
export const selectCartItemCount = (state: CartStore) => state.getItemCount();
export const selectCartSubtotal = (state: CartStore) => state.getSubtotal();
export const selectCartTotalQuantity = (state: CartStore) =>
  state.getTotalQuantity();