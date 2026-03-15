const DEFAULT_SEPARATOR = "-";

export interface SlugifyOptions {
  separator?: string;
  lowercase?: boolean;
  strict?: boolean;
  trim?: boolean;
  fallback?: string;
  maxLength?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeToAscii(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function slugify(value: string, options: SlugifyOptions = {}): string {
  const {
    separator = DEFAULT_SEPARATOR,
    lowercase = true,
    strict = true,
    trim = true,
    fallback = "item",
    maxLength,
  } = options;

  if (!value || typeof value !== "string") {
    return fallback;
  }

  let result = normalizeToAscii(value);

  if (lowercase) {
    result = result.toLowerCase();
  }

  result = result
    .replace(/&/g, " and ")
    .replace(/['’"]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, strict ? " " : "");

  const separatorPattern = new RegExp(`[\\s_]+`, "g");
  result = result.replace(separatorPattern, separator);

  const duplicateSeparatorPattern = new RegExp(`${escapeRegExp(separator)}+`, "g");
  result = result.replace(duplicateSeparatorPattern, separator);

  if (trim) {
    const edgeSeparatorPattern = new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, "g");
    result = result.replace(edgeSeparatorPattern, "");
  }

  if (typeof maxLength === "number" && maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength);

    if (trim) {
      const trailingSeparatorPattern = new RegExp(`${escapeRegExp(separator)}+$`, "g");
      result = result.replace(trailingSeparatorPattern, "");
    }
  }

  return result || fallback;
}

export function createUniqueSlug(
  value: string,
  existingSlugs: string[] = [],
  options: SlugifyOptions = {},
): string {
  const baseSlug = slugify(value, options);
  const normalizedExisting = new Set(existingSlugs.filter(Boolean));

  if (!normalizedExisting.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let candidate = `${baseSlug}${options.separator || DEFAULT_SEPARATOR}${counter}`;

  while (normalizedExisting.has(candidate)) {
    counter += 1;
    candidate = `${baseSlug}${options.separator || DEFAULT_SEPARATOR}${counter}`;
  }

  return candidate;
}

export function isValidSlug(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function parseSlugId(value: string): { slug: string; id: string | null } {
  if (!value || typeof value !== "string") {
    return { slug: "", id: null };
  }

  const match = value.match(/^(.*?)-([a-zA-Z0-9]+)$/);

  if (!match) {
    return { slug: value, id: null };
  }

  return {
    slug: match[1],
    id: match[2],
  };
}

export function withSlugId(slug: string, id: string | number): string {
  const normalizedSlug = slugify(slug);
  const normalizedId = String(id).trim();

  if (!normalizedId) {
    return normalizedSlug;
  }

  return `${normalizedSlug}-${normalizedId}`;
}