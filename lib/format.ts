const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

type Nullable<T> = T | null | undefined;

function toNumber(value: Nullable<number | string>): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatCurrency(
  amount: Nullable<number | string>,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const value = toNumber(amount);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatPrice(
  amount: Nullable<number | string>,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return formatCurrency(amount, currency, locale);
}

export function formatNumber(
  value: Nullable<number | string>,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const numericValue = toNumber(value);

  try {
    return new Intl.NumberFormat(locale, options).format(numericValue);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(numericValue);
  }
}

export function formatCompactNumber(
  value: Nullable<number | string>,
  locale: string = DEFAULT_LOCALE,
): string {
  return formatNumber(value, locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatPercent(
  value: Nullable<number | string>,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  const numericValue = toNumber(value);

  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 2,
      ...options,
    }).format(numericValue);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "percent",
      maximumFractionDigits: 2,
      ...options,
    }).format(numericValue);
  }
}

export function formatDate(
  value: Nullable<string | number | Date>,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
  }
}

export function formatDateTime(
  value: Nullable<string | number | Date>,
  locale: string = DEFAULT_LOCALE,
): string {
  return formatDate(value, locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatShortDate(
  value: Nullable<string | number | Date>,
  locale: string = DEFAULT_LOCALE,
): string {
  return formatDate(value, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(
  value: Nullable<string | number | Date>,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffInMs = date.getTime() - Date.now();
  const diffInSeconds = Math.round(diffInMs / 1000);
  const absSeconds = Math.abs(diffInSeconds);

  const divisions = [
    { amount: 60, unit: "second" as const },
    { amount: 60, unit: "minute" as const },
    { amount: 24, unit: "hour" as const },
    { amount: 7, unit: "day" as const },
    { amount: 4.34524, unit: "week" as const },
    { amount: 12, unit: "month" as const },
    { amount: Number.POSITIVE_INFINITY, unit: "year" as const },
  ];

  let duration = diffInSeconds;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      try {
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
          Math.round(duration),
          division.unit,
        );
      } catch {
        return new Intl.RelativeTimeFormat(DEFAULT_LOCALE, {
          numeric: "auto",
        }).format(Math.round(duration), division.unit);
      }
    }

    duration /= division.amount;
  }

  if (absSeconds < 5) {
    return "just now";
  }

  return formatDateTime(date, locale);
}

export function formatOrderNumber(value: Nullable<string | number>): string {
  if (value === null || value === undefined || value === "") {
    return "#000000";
  }

  const raw = String(value).trim();
  const normalized = raw.replace(/^#/, "");

  if (/^\d+$/.test(normalized)) {
    return `#${normalized.padStart(6, "0")}`;
  }

  return raw.startsWith("#") ? raw : `#${raw}`;
}

export function formatSku(value: Nullable<string>): string {
  if (!value) return "N/A";
  return value.trim().toUpperCase();
}

export function formatStockCount(count: Nullable<number | string>): string {
  const value = Math.max(0, Math.floor(toNumber(count)));

  if (value === 0) return "Out of stock";
  if (value === 1) return "1 item left";
  return `${formatNumber(value)} items in stock`;
}

export function formatFileSize(bytes: Nullable<number | string>): string {
  const value = toNumber(bytes);

  if (value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const size = value / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : size >= 10 ? 1 : 2;

  return `${size.toFixed(decimals)} ${units[exponent]}`;
}

export function formatPhoneNumber(value: Nullable<string>): string {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return value.trim();
}

export function truncateText(value: Nullable<string>, maxLength = 100): string {
  if (!value) return "";
  if (maxLength <= 0) return "";

  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}