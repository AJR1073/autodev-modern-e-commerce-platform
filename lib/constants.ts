export const APP_NAME = 'Modern Commerce';
export const APP_DESCRIPTION =
  'A modern e-commerce platform for browsing products, managing carts, and completing secure online purchases.';
export const COMPANY_NAME = 'Modern Commerce Co.';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';
export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL || 'sales@example.com';
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';

export const SHIPPING_PROVIDER_NAME =
  process.env.SHIPPING_PROVIDER_NAME || 'Standard Shipping';

export const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || DEFAULT_CURRENCY).toLowerCase();

export const TAX_RATE = Number(process.env.NEXT_PUBLIC_TAX_RATE || '0.08');
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || '100'
);
export const STANDARD_SHIPPING_RATE = Number(
  process.env.NEXT_PUBLIC_STANDARD_SHIPPING_RATE || '9.99'
);

export const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || '5');
export const DEFAULT_PAGE_SIZE = Number(process.env.DEFAULT_PAGE_SIZE || '12');
export const ADMIN_PAGE_SIZE = Number(process.env.ADMIN_PAGE_SIZE || '20');
export const MAX_PAGE_SIZE = Number(process.env.MAX_PAGE_SIZE || '100');
export const SEARCH_DEBOUNCE_MS = Number(process.env.SEARCH_DEBOUNCE_MS || '300');

export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || 'modern-commerce-session';
export const CART_COOKIE_NAME = process.env.CART_COOKIE_NAME || 'modern-commerce-cart';

export const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';
export const DEFAULT_PRODUCT_IMAGE = '/images/default-product.svg';
export const DEFAULT_AVATAR_IMAGE = '/images/default-avatar.svg';

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export const INVENTORY_STATUSES = [
  'IN_STOCK',
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'BACKORDER',
] as const;

export const USER_ROLES = ['CUSTOMER', 'ADMIN'] as const;

export const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A to Z', value: 'name-asc' },
  { label: 'Name: Z to A', value: 'name-desc' },
] as const;

export const PRICE_RANGES = [
  { label: 'Under $25', min: 0, max: 25 },
  { label: '$25 to $50', min: 25, max: 50 },
  { label: '$50 to $100', min: 50, max: 100 },
  { label: '$100 to $250', min: 100, max: 250 },
  { label: '$250+', min: 250, max: null },
] as const;

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Cart', href: '/cart' },
  { label: 'Account', href: '/account' },
] as const;

export const ADMIN_NAV_LINKS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Inventory', href: '/admin/inventory' },
] as const;

export const FOOTER_LINKS = {
  shop: [
    { label: 'All Products', href: '/products' },
    { label: 'Cart', href: '/cart' },
    { label: 'Checkout', href: '/checkout' },
  ],
  company: [
    { label: 'Account', href: '/account' },
    { label: 'Admin', href: '/admin' },
  ],
} as const;

export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
  },
  products: '/api/products',
  categories: '/api/categories',
  cart: '/api/cart',
  checkout: '/api/checkout',
  orders: '/api/orders',
  inventory: '/api/inventory',
  notificationsEmail: '/api/notifications/email',
  stripeWebhook: '/api/stripe/webhook',
} as const;

export const QUERY_KEYS = {
  products: 'products',
  product: 'product',
  categories: 'categories',
  cart: 'cart',
  checkout: 'checkout',
  orders: 'orders',
  inventory: 'inventory',
  me: 'me',
} as const;

export const MESSAGES = {
  genericError: 'Something went wrong. Please try again.',
  unauthorized: 'You must be signed in to continue.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'The requested resource could not be found.',
  validationError: 'Please check your input and try again.',
  cartEmpty: 'Your cart is currently empty.',
  orderPlaced: 'Your order has been placed successfully.',
  inventoryUpdated: 'Inventory updated successfully.',
  productSaved: 'Product saved successfully.',
  loginSuccess: 'Signed in successfully.',
  registerSuccess: 'Account created successfully.',
} as const;

export const SEO_DEFAULTS = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  siteName: APP_NAME,
  url: SITE_URL,
  locale: DEFAULT_LOCALE,
  type: 'website',
} as const;

export const FEATURE_FLAGS = {
  enableReviews: false,
  enableWishlists: false,
  enableAdvancedSearch: true,
  enableLowStockAlerts: true,
  enableAdminDashboard: true,
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];