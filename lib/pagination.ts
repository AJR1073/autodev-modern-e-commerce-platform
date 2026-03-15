export type PaginationInput = {
  page?: number | string | null | undefined;
  pageSize?: number | string | null | undefined;
  maxPageSize?: number;
  defaultPage?: number;
  defaultPageSize?: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta & {
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_MAX_PAGE_SIZE = 100;

function toSafePositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function getPagination(input: PaginationInput = {}): PaginationMeta {
  const defaultPage = toSafePositiveInteger(
    input.defaultPage,
    DEFAULT_PAGE,
  );
  const defaultPageSize = toSafePositiveInteger(
    input.defaultPageSize,
    DEFAULT_PAGE_SIZE,
  );
  const maxPageSize = toSafePositiveInteger(
    input.maxPageSize,
    DEFAULT_MAX_PAGE_SIZE,
  );

  const page = toSafePositiveInteger(input.page, defaultPage);
  const requestedPageSize = toSafePositiveInteger(input.pageSize, defaultPageSize);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function getPaginationMeta(
  totalItems: number,
  input: PaginationInput = {},
): PaginatedResult<never>["meta"] {
  const pagination = getPagination(input);
  const safeTotalItems =
    typeof totalItems === "number" && Number.isFinite(totalItems) && totalItems > 0
      ? Math.floor(totalItems)
      : 0;

  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pagination.pageSize));

  return {
    ...pagination,
    totalItems: safeTotalItems,
    totalPages,
    hasPreviousPage: pagination.page > 1,
    hasNextPage: pagination.page < totalPages,
  };
}

export function paginateItems<T>(
  items: T[],
  totalItems: number,
  input: PaginationInput = {},
): PaginatedResult<T> {
  return {
    items,
    meta: getPaginationMeta(totalItems, input),
  };
}