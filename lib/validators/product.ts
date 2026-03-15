import { z } from 'zod';

const productStatusValues = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

const skuRegex = /^[A-Z0-9_-]{3,64}$/i;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const currencyRegex = /^[A-Z]{3}$/;
const imageUrlRegex = /^https?:\/\/.+/i;

const stringToOptional = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const numericInput = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be a valid number.',
    });

    return z.NEVER;
  }

  return parsed;
});

const integerInput = numericInput.refine((value) => Number.isInteger(value), {
  message: 'Must be a whole number.',
});

const monetaryInput = numericInput
  .refine((value) => value >= 0, {
    message: 'Amount must be greater than or equal to 0.',
  })
  .refine((value) => Number(value.toFixed(2)) === value, {
    message: 'Amount can have at most 2 decimal places.',
  });

export const productImageSchema = z.object({
  url: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(1, 'Image URL is required.')
      .regex(imageUrlRegex, 'Image URL must be a valid http or https URL.')
  ),
  alt: z.preprocess(
    stringToOptional,
    z.string().max(200, 'Alt text must be 200 characters or fewer.').optional()
  ),
});

export const productSeoSchema = z.object({
  title: z.preprocess(
    stringToOptional,
    z.string().min(1, 'SEO title is required.').max(70, 'SEO title must be 70 characters or fewer.').optional()
  ),
  description: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(1, 'SEO description is required.')
      .max(160, 'SEO description must be 160 characters or fewer.')
      .optional()
  ),
});

const productBaseSchema = z.object({
  name: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(2, 'Product name must be at least 2 characters.')
      .max(120, 'Product name must be 120 characters or fewer.')
  ),
  slug: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(2, 'Slug must be at least 2 characters.')
      .max(140, 'Slug must be 140 characters or fewer.')
      .regex(slugRegex, 'Slug must be lowercase and hyphen-separated.')
  ),
  description: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(10, 'Description must be at least 10 characters.')
      .max(5000, 'Description must be 5000 characters or fewer.')
  ),
  shortDescription: z.preprocess(
    stringToOptional,
    z.string().max(280, 'Short description must be 280 characters or fewer.').optional()
  ),
  sku: z.preprocess(
    stringToOptional,
    z
      .string()
      .min(3, 'SKU must be at least 3 characters.')
      .max(64, 'SKU must be 64 characters or fewer.')
      .regex(skuRegex, 'SKU may only contain letters, numbers, underscores, and hyphens.')
  ),
  price: monetaryInput,
  compareAtPrice: monetaryInput.optional(),
  cost: monetaryInput.optional(),
  currency: z.preprocess(
    stringToOptional,
    z.string().regex(currencyRegex, 'Currency must be a 3-letter ISO code.').default('USD')
  ),
  stock: integerInput.refine((value) => value >= 0, {
    message: 'Stock must be greater than or equal to 0.',
  }),
  lowStockThreshold: integerInput
    .refine((value) => value >= 0, {
      message: 'Low stock threshold must be greater than or equal to 0.',
    })
    .optional(),
  categoryId: z.preprocess(
    stringToOptional,
    z.string().min(1, 'Category is required.')
  ),
  status: z.enum(productStatusValues).default('DRAFT'),
  isFeatured: z.boolean().optional().default(false),
  isDigital: z.boolean().optional().default(false),
  images: z.array(productImageSchema).max(20, 'A maximum of 20 images is allowed.').optional().default([]),
  tags: z
    .array(
      z.preprocess(
        stringToOptional,
        z.string().min(1, 'Tag cannot be empty.').max(50, 'Tag must be 50 characters or fewer.')
      )
    )
    .max(20, 'A maximum of 20 tags is allowed.')
    .optional()
    .default([]),
  seo: productSeoSchema.optional(),
});

export const productSchema = productBaseSchema.superRefine((data, ctx) => {
  if (typeof data.compareAtPrice === 'number' && data.compareAtPrice < data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'Compare-at price must be greater than or equal to the price.',
    });
  }

  if (typeof data.cost === 'number' && data.cost > data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cost'],
      message: 'Cost should not exceed the selling price.',
    });
  }
});

export const createProductSchema = productSchema;

export const updateProductSchema = productBaseSchema.partial().superRefine((data, ctx) => {
  if (
    typeof data.price === 'number' &&
    typeof data.compareAtPrice === 'number' &&
    data.compareAtPrice < data.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compareAtPrice'],
      message: 'Compare-at price must be greater than or equal to the price.',
    });
  }

  if (typeof data.price === 'number' && typeof data.cost === 'number' && data.cost > data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cost'],
      message: 'Cost should not exceed the selling price.',
    });
  }
});

export const productQuerySchema = z.object({
  page: integerInput.refine((value) => value > 0, {
    message: 'Page must be greater than 0.',
  }).optional(),
  limit: integerInput.refine((value) => value > 0 && value <= 100, {
    message: 'Limit must be between 1 and 100.',
  }).optional(),
  search: z.preprocess(
    stringToOptional,
    z.string().max(120, 'Search query must be 120 characters or fewer.').optional()
  ),
  category: z.preprocess(
    stringToOptional,
    z.string().max(100, 'Category must be 100 characters or fewer.').optional()
  ),
  status: z.enum(productStatusValues).optional(),
  featured: z.coerce.boolean().optional(),
  minPrice: monetaryInput.optional(),
  maxPrice: monetaryInput.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price', 'stock']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).superRefine((data, ctx) => {
  if (
    typeof data.minPrice === 'number' &&
    typeof data.maxPrice === 'number' &&
    data.minPrice > data.maxPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minPrice'],
      message: 'Minimum price cannot be greater than maximum price.',
    });
  }
});

export type ProductImageInput = z.infer<typeof productImageSchema>;
export type ProductSeoInput = z.infer<typeof productSeoSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;