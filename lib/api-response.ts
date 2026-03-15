import { NextResponse } from 'next/server';

export type ApiSuccess<T = unknown> = {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  message: string;
  errors?: unknown;
  code?: string;
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

type ResponseInitOptions = {
  status?: number;
  headers?: HeadersInit;
};

export function successResponse<T>(
  data: T,
  options: ResponseInitOptions & {
    message?: string;
    meta?: Record<string, unknown>;
  } = {},
) {
  const { status = 200, headers, message, meta } = options;

  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers,
  });
}

export function errorResponse(
  message = 'Something went wrong.',
  options: ResponseInitOptions & {
    errors?: unknown;
    code?: string;
  } = {},
) {
  const { status = 400, headers, errors, code } = options;

  const body: ApiError = {
    success: false,
    message,
    ...(typeof errors !== 'undefined' ? { errors } : {}),
    ...(code ? { code } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers,
  });
}

export function createdResponse<T>(
  data: T,
  options: Omit<ResponseInitOptions, 'status'> & {
    message?: string;
    meta?: Record<string, unknown>;
  } = {},
) {
  return successResponse(data, {
    ...options,
    status: 201,
  });
}

export function noContentResponse(headers?: HeadersInit) {
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  },
  options: Omit<ResponseInitOptions, 'status'> & {
    message?: string;
    additionalMeta?: Record<string, unknown>;
  } = {},
) {
  const { headers, message, additionalMeta } = options;
  const totalPages =
    pagination.totalPages ?? Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return successResponse(data, {
    status: 200,
    headers,
    message,
    meta: {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
      ...(additionalMeta || {}),
    },
  });
}

export function handleApiError(error: unknown, fallbackMessage = 'Internal server error.') {
  if (error instanceof Error) {
    return errorResponse(error.message || fallbackMessage, {
      status: 500,
      errors:
        process.env.NODE_ENV === 'development'
          ? {
              name: error.name,
              stack: error.stack,
            }
          : undefined,
    });
  }

  return errorResponse(fallbackMessage, {
    status: 500,
    errors: process.env.NODE_ENV === 'development' ? error : undefined,
  });
}