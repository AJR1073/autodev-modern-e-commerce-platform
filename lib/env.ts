type AppEnv = {
  nodeEnv: string;
  appName: string;
  appUrl: string;
  databaseUrl: string;
  directUrl: string;
  jwtSecret: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  sendGridApiKey: string;
  sendGridFromEmail: string;
  sendGridFromName: string;
  adminEmail: string;
  shippingProviderApiKey: string;
  shippingProviderBaseUrl: string;
  defaultCurrency: string;
  defaultLocale: string;
  taxRate: number;
  freeShippingThreshold: number;
  standardShippingRate: number;
  cartCookieName: string;
  sessionCookieName: string;
  authCookieName: string;
  bcryptSaltRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  lowStockThreshold: number;
  enableMockPayments: boolean;
  enableEmailNotifications: boolean;
  enableAdminSeed: boolean;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;

  return fallback;
};

const normalizeUrl = (value: string | undefined, fallback: string): string => {
  const raw = value?.trim() || fallback;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV || "development",
  appName: process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "Modern E-Commerce Platform",
  appUrl: normalizeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL, "http://localhost:3000"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ecommerce",
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ecommerce",
  jwtSecret: process.env.JWT_SECRET || "development-jwt-secret",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  sendGridApiKey: process.env.SENDGRID_API_KEY || "",
  sendGridFromEmail: process.env.SENDGRID_FROM_EMAIL || "no-reply@example.com",
  sendGridFromName: process.env.SENDGRID_FROM_NAME || "Modern E-Commerce Platform",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  shippingProviderApiKey: process.env.SHIPPING_PROVIDER_API_KEY || "",
  shippingProviderBaseUrl: normalizeUrl(process.env.SHIPPING_PROVIDER_BASE_URL, "https://api.shipping-provider.local"),
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || process.env.DEFAULT_CURRENCY || "USD",
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || process.env.DEFAULT_LOCALE || "en-US",
  taxRate: toNumber(process.env.TAX_RATE, 0),
  freeShippingThreshold: toNumber(process.env.FREE_SHIPPING_THRESHOLD, 100),
  standardShippingRate: toNumber(process.env.STANDARD_SHIPPING_RATE, 9.99),
  cartCookieName: process.env.CART_COOKIE_NAME || "cart_id",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "session_id",
  authCookieName: process.env.AUTH_COOKIE_NAME || "auth_token",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  lowStockThreshold: toNumber(process.env.LOW_STOCK_THRESHOLD, 5),
  enableMockPayments: toBoolean(process.env.ENABLE_MOCK_PAYMENTS, true),
  enableEmailNotifications: toBoolean(process.env.ENABLE_EMAIL_NOTIFICATIONS, true),
  enableAdminSeed: toBoolean(process.env.ENABLE_ADMIN_SEED, false),
};

export const isDev = env.nodeEnv === "development";
export const isTest = env.nodeEnv === "test";
export const isProd = env.nodeEnv === "production";

export const publicEnv = {
  appName: env.appName,
  appUrl: env.appUrl,
  stripePublishableKey: env.stripePublishableKey,
  defaultCurrency: env.defaultCurrency,
  defaultLocale: env.defaultLocale,
};

export type PublicEnv = typeof publicEnv;