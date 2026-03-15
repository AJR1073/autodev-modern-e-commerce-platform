import { z } from "zod";

export const orderStatusValues = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const fulfillmentStatusValues = [
  "UNFULFILLED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "RETURNED",
] as const;

export const paymentStatusValues = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  addressLine1: z.string().trim().min(1, "Address line 1 is required").max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().min(1, "State/Province is required").max(120),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(2, "Country is required").max(2),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  name: z.string().trim().min(1, "Product name is required").max(255),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(999),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  totalPrice: z.coerce.number().min(0, "Total price cannot be negative").optional(),
});

export const createOrderSchema = z.object({
  userId: z.string().trim().optional(),
  email: z.string().trim().email("A valid email address is required"),
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").default("USD"),
  items: z.array(orderItemSchema).min(1, "At least one order item is required"),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  status: z.enum(orderStatusValues).optional().default("PENDING"),
  paymentStatus: z.enum(paymentStatusValues).optional().default("PENDING"),
  fulfillmentStatus: z.enum(fulfillmentStatusValues).optional().default("UNFULFILLED"),
  subtotalAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional().default(0),
  shippingAmount: z.coerce.number().min(0).optional().default(0),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  totalAmount: z.coerce.number().min(0).optional(),
  stripePaymentIntentId: z.string().trim().max(255).optional().or(z.literal("")),
  stripeCheckoutSessionId: z.string().trim().max(255).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  const computedSubtotal = data.items.reduce((sum, item) => {
    const lineTotal = typeof item.totalPrice === "number" ? item.totalPrice : item.unitPrice * item.quantity;
    return sum + lineTotal;
  }, 0);

  const subtotal = typeof data.subtotalAmount === "number" ? data.subtotalAmount : computedSubtotal;
  const tax = data.taxAmount ?? 0;
  const shipping = data.shippingAmount ?? 0;
  const discount = data.discountAmount ?? 0;
  const computedTotal = subtotal + tax + shipping - discount;
  const roundedComputedTotal = Number(computedTotal.toFixed(2));

  if (typeof data.subtotalAmount === "number") {
    const roundedSubtotal = Number(subtotal.toFixed(2));
    const roundedComputedSubtotal = Number(computedSubtotal.toFixed(2));

    if (roundedSubtotal !== roundedComputedSubtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subtotalAmount"],
        message: "Subtotal does not match the sum of order items",
      });
    }
  }

  if (discount > subtotal + tax + shipping) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountAmount"],
      message: "Discount cannot exceed the order total before discount",
    });
  }

  if (typeof data.totalAmount === "number") {
    const roundedProvidedTotal = Number(data.totalAmount.toFixed(2));

    if (roundedProvidedTotal !== roundedComputedTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalAmount"],
        message: "Total amount does not match the calculated order total",
      });
    }
  }
});

export const updateOrderSchema = z.object({
  email: z.string().trim().email().optional(),
  status: z.enum(orderStatusValues).optional(),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  fulfillmentStatus: z.enum(fulfillmentStatusValues).optional(),
  billingAddress: addressSchema.partial().optional(),
  shippingAddress: addressSchema.partial().optional(),
  trackingNumber: z.string().trim().max(255).optional().or(z.literal("")),
  carrier: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  stripePaymentIntentId: z.string().trim().max(255).optional().or(z.literal("")),
  stripeCheckoutSessionId: z.string().trim().max(255).optional().or(z.literal("")),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  fulfillmentStatus: z.enum(fulfillmentStatusValues).optional(),
  trackingNumber: z.string().trim().max(255).optional().or(z.literal("")),
  carrier: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(orderStatusValues).optional(),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  fulfillmentStatus: z.enum(fulfillmentStatusValues).optional(),
  userId: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;