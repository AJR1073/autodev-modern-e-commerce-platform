import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function safeJsonParse<T = unknown>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncate(value: string, length = 120, suffix = '...') {
  if (!value) return '';
  if (value.length <= length) return value;
  return `${value.slice(0, Math.max(0, length - suffix.length)).trimEnd()}${suffix}`;
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(value: string, maxLength = 2) {
  if (!isNonEmptyString(value)) return '';
  return value
    .trim()
    .split(/\s+/)
    .slice(0, maxLength)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function toTitleCase(value: string) {
  if (!isNonEmptyString(value)) return '';
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function uniqueBy<T, K>(items: T[], getKey: (item: T) => K) {
  const seen = new Set<K>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPositiveInt(value: unknown, fallback = 1) {
  const parsed = Math.floor(toNumber(value, fallback));
  return parsed > 0 ? parsed : fallback;
}

export function formatErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof Error && isNonEmptyString(error.message)) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    isNonEmptyString((error as { message?: unknown }).message)
  ) {
    return (error as { message: string }).message;
  }

  if (isNonEmptyString(error)) {
    return error;
  }

  return fallback;
}

export function buildUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') continue;
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]) {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]) {
  const clone = { ...obj };
  for (const key of keys) {
    delete clone[key];
  }
  return clone as Omit<T, K>;
}