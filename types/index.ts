export type ID = string;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type UserRole = "CUSTOMER" | "ADMIN" | "FULFILLMENT";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type InventoryStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type PaymentStatus =
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";

export type CurrencyCode = "USD" | "EUR" | "GBP";

export interface SeoMetadata {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  image?: string | null;
}

export interface Category {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProductImage {
  id?: ID;
  url: string;
  alt?: string | null;
  sortOrder?: number;
}

export interface Product {
  id: ID;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  currency: CurrencyCode;
  categoryId: ID;
  category?: Category | null;
  images?: ProductImage[];
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  status?: ProductStatus;
  tags?: string[];
  seo?: SeoMetadata | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InventoryItem {
  id?: ID;
  productId: ID;
  quantity: number;
  reservedQuantity?: number;
  reorderLevel?: number;
  status?: InventoryStatus;
  updatedAt?: string | Date;
  product?: Product;
}

export interface CartItem {
  productId: ID;
  product?: Product;
  name?: string;
  slug?: string;
  imageUrl?: string | null;
  sku?: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
}

export interface Cart {
  id?: ID;
  userId?: ID | null;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: CurrencyCode;
  itemCount: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface CheckoutCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  estimatedDays?: number | null;
}

export interface PaymentIntentResult {
  clientSecret?: string | null;
  paymentIntentId?: string | null;
  status?: string | null;
}

export interface CheckoutPayload {
  customer: CheckoutCustomer;
  shippingAddress: Address;
  billingAddress?: Address | null;
  sameAsShipping?: boolean;
  items: CartItem[];
  shippingMethod?: ShippingMethod | null;
  notes?: string | null;
  couponCode?: string | null;
  currency?: CurrencyCode;
}

export interface OrderItem {
  id?: ID;
  productId: ID;
  product?: Product;
  name: string;
  sku: string;
  slug?: string;
  imageUrl?: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: ID;
  orderNumber: string;
  userId?: ID | null;
  email: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  currency: CurrencyCode;
  items: OrderItem[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  shippingAddress: Address;
  billingAddress?: Address | null;
  notes?: string | null;
  trackingNumber?: string | null;
  stripePaymentIntentId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthUser {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser | null;
  token?: string | null;
  expiresAt?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilters {
  query?: string;
  category?: string;
  categoryId?: string;
  featured?: boolean;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?:
    | "newest"
    | "oldest"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "name-desc";
  page?: number;
  pageSize?: number;
}

export interface InventoryAlert {
  productId: ID;
  productName: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  status: InventoryStatus;
}

export interface NotificationEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface OrderConfirmationEmailData {
  order: Order;
  customerName: string;
  supportEmail?: string;
}

export interface ShippingUpdateEmailData {
  order: Order;
  customerName: string;
  trackingUrl?: string | null;
}

export interface LowStockAlertEmailData {
  alerts: InventoryAlert[];
  adminName?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface SearchResult<T> {
  items: T[];
  query: string;
  total: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string | null;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: CurrencyCode;
  categoryId: ID;
  imageUrl?: string | null;
  images?: ProductImage[];
  isFeatured?: boolean;
  isActive?: boolean;
  status?: ProductStatus;
  tags?: string[];
  seo?: SeoMetadata | null;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: ID;
}

export interface AddToCartInput {
  productId: ID;
  quantity: number;
}

export interface UpdateCartItemInput {
  productId: ID;
  quantity: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}