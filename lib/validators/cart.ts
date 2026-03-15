import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number({
      invalid_type_error: 'Quantity must be a number',
      required_error: 'Quantity is required',
    })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99'),
});

export const addToCartSchema = cartItemSchema;

export const updateCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number({
      invalid_type_error: 'Quantity must be a number',
      required_error: 'Quantity is required',
    })
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(99, 'Quantity cannot exceed 99'),
});

export const removeCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const cartMetadataSchema = z
  .object({
    currency: z.string().min(3).max(3).optional(),
    couponCode: z.string().trim().min(1).max(64).optional(),
  })
  .optional();

export const cartSchema = z.object({
  items: z.array(cartItemSchema).max(100, 'Cart cannot contain more than 100 items'),
  metadata: cartMetadataSchema,
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
export type CartInput = z.infer<typeof cartSchema>;