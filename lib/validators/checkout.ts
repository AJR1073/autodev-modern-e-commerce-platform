import { z } from 'zod';

const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
const postalCodeRegex = /^[A-Za-z0-9\s-]{3,12}$/;
const countryCodeRegex = /^[A-Z]{2}$/;

export const addressSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  company: z
    .string()
    .trim()
    .max(150, 'Company name is too long')
    .optional()
    .or(z.literal('')),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .max(200, 'Address line 1 is too long'),
  addressLine2: z
    .string()
    .trim()
    .max(200, 'Address line 2 is too long')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City is too long'),
  state: z
    .string()
    .trim()
    .min(1, 'State or province is required')
    .max(100, 'State or province is too long'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'Postal code is required')
    .max(12, 'Postal code is too long')
    .regex(postalCodeRegex, 'Postal code format is invalid'),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(countryCodeRegex, 'Country must be a 2-letter ISO code'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number is too long')
    .regex(phoneRegex, 'Phone number format is invalid'),
});

export const shippingMethodSchema = z.enum(['standard', 'express', 'overnight']);

export const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  quantity: z
    .number({
      invalid_type_error: 'Quantity must be a number',
      required_error: 'Quantity is required',
    })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

export const checkoutSchema = z
  .object({
    email: z.string().trim().email('A valid email address is required'),
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    sameAsBilling: z.boolean().optional().default(false),
    shippingMethod: shippingMethodSchema.default('standard'),
    items: z
      .array(checkoutItemSchema)
      .min(1, 'At least one item is required for checkout')
      .max(100, 'Too many items in checkout'),
    notes: z
      .string()
      .trim()
      .max(1000, 'Order notes are too long')
      .optional()
      .or(z.literal('')),
    couponCode: z
      .string()
      .trim()
      .max(50, 'Coupon code is too long')
      .optional()
      .or(z.literal('')),
    paymentMethodId: z
      .string()
      .trim()
      .min(1, 'Payment method is required')
      .max(255, 'Payment method identifier is too long')
      .optional(),
    stripePaymentIntentId: z
      .string()
      .trim()
      .min(1, 'Stripe payment intent ID is required')
      .max(255, 'Stripe payment intent ID is too long')
      .optional(),
  })
  .superRefine((data, ctx) => {
    const itemCounts = new Map<string, number>();

    for (const item of data.items) {
      const normalizedProductId = item.productId.trim();
      itemCounts.set(normalizedProductId, (itemCounts.get(normalizedProductId) || 0) + 1);
    }

    for (const [productId, count] of itemCounts.entries()) {
      if (count > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: `Duplicate product detected in checkout items: ${productId}`,
        });
      }
    }
  });

export const createCheckoutSessionSchema = z.object({
  cartId: z.string().trim().min(1, 'Cart ID is required').optional(),
  email: z.string().trim().email('A valid email address is required'),
  successUrl: z.string().trim().url('Success URL must be a valid URL'),
  cancelUrl: z.string().trim().url('Cancel URL must be a valid URL'),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  shippingMethod: shippingMethodSchema.optional(),
  couponCode: z
    .string()
    .trim()
    .max(50, 'Coupon code is too long')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(1000, 'Order notes are too long')
    .optional()
    .or(z.literal('')),
});

export const checkoutQuerySchema = z.object({
  sessionId: z.string().trim().min(1, 'Session ID is required').optional(),
  orderId: z.string().trim().min(1, 'Order ID is required').optional(),
  email: z.string().trim().email('A valid email address is required').optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CheckoutQueryInput = z.infer<typeof checkoutQuerySchema>;