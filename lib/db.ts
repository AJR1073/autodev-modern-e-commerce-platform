import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type DbClient = typeof prisma;

export async function withDb<T>(
  operation: (db: DbClient) => Promise<T>,
): Promise<T> {
  return operation(prisma);
}

export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  },
): Promise<T> {
  return prisma.$transaction(
    async (tx) => operation(tx),
    {
      maxWait: options?.maxWait,
      timeout: options?.timeout,
      isolationLevel: options?.isolationLevel,
    },
  );
}

export async function healthcheckDb(): Promise<{
  ok: boolean;
  timestamp: string;
}> {
  await prisma.$queryRaw`SELECT 1`;

  return {
    ok: true,
    timestamp: new Date().toISOString(),
  };
}

export function isPrismaKnownError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaValidationError(
  error: unknown,
): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

export function isPrismaInitializationError(
  error: unknown,
): error is Prisma.PrismaClientInitializationError {
  return error instanceof Prisma.PrismaClientInitializationError;
}

export function isPrismaRustPanicError(
  error: unknown,
): error is Prisma.PrismaClientRustPanicError {
  return error instanceof Prisma.PrismaClientRustPanicError;
}

export function getDbErrorMessage(error: unknown): string {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case 'P2002':
        return 'A record with the same unique value already exists.';
      case 'P2003':
        return 'This action failed because a related record was not found.';
      case 'P2025':
        return 'The requested record could not be found.';
      default:
        return error.message || 'A database error occurred.';
    }
  }

  if (isPrismaValidationError(error)) {
    return 'Invalid data was provided for the database operation.';
  }

  if (isPrismaInitializationError(error)) {
    return 'The database connection could not be initialized.';
  }

  if (isPrismaRustPanicError(error)) {
    return 'The database engine encountered an unexpected error.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected database error occurred.';
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };