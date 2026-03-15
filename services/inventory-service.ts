import { Prisma, InventoryStatus } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type InventoryWithProduct = Prisma.InventoryGetPayload<{
  include: {
    product: true;
  };
}>;

export type InventorySummary = {
  totalProducts: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type InventoryAdjustmentInput = {
  productId: string;
  quantityDelta: number;
  reason?: string;
};

export type InventoryReservationItem = {
  productId: string;
  quantity: number;
};

export class InventoryError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'INVENTORY_ERROR', statusCode = 400) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeNumber(value: number | null | undefined, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return value;
}

function resolveStatus(quantity: number, lowStockThreshold: number) {
  if (quantity <= 0) {
    return InventoryStatus.OUT_OF_STOCK;
  }

  if (quantity <= lowStockThreshold) {
    return InventoryStatus.LOW_STOCK;
  }

  return InventoryStatus.IN_STOCK;
}

function clampThreshold(value: number | null | undefined) {
  const normalized = normalizeNumber(value, 5);
  return normalized < 0 ? 0 : normalized;
}

export const inventoryService = {
  async listInventory(options?: {
    search?: string;
    status?: InventoryStatus | 'ALL';
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;
    const search = options?.search?.trim();
    const status = options?.status;
    const lowStockOnly = options?.lowStockOnly || false;

    const where: Prisma.InventoryWhereInput = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(lowStockOnly
        ? {
            OR: [
              { status: InventoryStatus.LOW_STOCK },
              { status: InventoryStatus.OUT_OF_STOCK },
            ],
          }
        : {}),
      ...(search
        ? {
            product: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async getInventoryByProductId(productId: string): Promise<InventoryWithProduct | null> {
    if (!productId) {
      return null;
    }

    return prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true,
      },
    });
  },

  async ensureInventoryRecord(productId: string) {
    if (!productId) {
      throw new InventoryError('Product ID is required.', 'INVALID_PRODUCT_ID', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new InventoryError('Product not found.', 'PRODUCT_NOT_FOUND', 404);
    }

    const existing = await prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true,
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.inventory.create({
      data: {
        productId,
        quantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        status: InventoryStatus.OUT_OF_STOCK,
      },
      include: {
        product: true,
      },
    });
  },

  async createOrUpdateInventory(input: {
    productId: string;
    quantity?: number;
    reservedQuantity?: number;
    lowStockThreshold?: number;
  }) {
    if (!input.productId) {
      throw new InventoryError('Product ID is required.', 'INVALID_PRODUCT_ID', 400);
    }

    const quantity = Math.max(0, normalizeNumber(input.quantity, 0));
    const reservedQuantity = Math.max(0, normalizeNumber(input.reservedQuantity, 0));
    const lowStockThreshold = clampThreshold(input.lowStockThreshold);
    const status = resolveStatus(quantity, lowStockThreshold);

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });

    if (!product) {
      throw new InventoryError('Product not found.', 'PRODUCT_NOT_FOUND', 404);
    }

    return prisma.inventory.upsert({
      where: { productId: input.productId },
      update: {
        quantity,
        reservedQuantity,
        lowStockThreshold,
        status,
      },
      create: {
        productId: input.productId,
        quantity,
        reservedQuantity,
        lowStockThreshold,
        status,
      },
      include: {
        product: true,
      },
    });
  },

  async updateInventoryThreshold(productId: string, lowStockThreshold: number) {
    const existing = await this.ensureInventoryRecord(productId);
    const threshold = clampThreshold(lowStockThreshold);
    const status = resolveStatus(existing.quantity, threshold);

    return prisma.inventory.update({
      where: { productId },
      data: {
        lowStockThreshold: threshold,
        status,
      },
      include: {
        product: true,
      },
    });
  },

  async adjustInventory(input: InventoryAdjustmentInput) {
    if (!input.productId) {
      throw new InventoryError('Product ID is required.', 'INVALID_PRODUCT_ID', 400);
    }

    if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
      throw new InventoryError(
        'Quantity delta must be a non-zero number.',
        'INVALID_QUANTITY_DELTA',
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId: input.productId },
      });

      if (!inventory) {
        throw new InventoryError('Inventory record not found.', 'INVENTORY_NOT_FOUND', 404);
      }

      const nextQuantity = inventory.quantity + input.quantityDelta;

      if (nextQuantity < 0) {
        throw new InventoryError(
          'Inventory adjustment would result in negative stock.',
          'INSUFFICIENT_STOCK',
          409
        );
      }

      const nextReserved = Math.min(inventory.reservedQuantity, nextQuantity);
      const nextStatus = resolveStatus(nextQuantity, inventory.lowStockThreshold);

      return tx.inventory.update({
        where: { productId: input.productId },
        data: {
          quantity: nextQuantity,
          reservedQuantity: nextReserved,
          status: nextStatus,
          lastRestockedAt: input.quantityDelta > 0 ? new Date() : inventory.lastRestockedAt,
        },
        include: {
          product: true,
        },
      });
    });
  },

  async reserveStock(items: InventoryReservationItem[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new InventoryError('Reservation items are required.', 'INVALID_RESERVATION_ITEMS', 400);
    }

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(0, normalizeNumber(item.quantity, 0)),
    }));

    if (normalizedItems.some((item) => !item.productId || item.quantity <= 0)) {
      throw new InventoryError(
        'Each reservation item must include a valid product ID and quantity.',
        'INVALID_RESERVATION_ITEM',
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      const results: InventoryWithProduct[] = [];

      for (const item of normalizedItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
          include: {
            product: true,
          },
        });

        if (!inventory) {
          throw new InventoryError(
            `Inventory record not found for product ${item.productId}.`,
            'INVENTORY_NOT_FOUND',
            404
          );
        }

        const availableQuantity = inventory.quantity - inventory.reservedQuantity;

        if (availableQuantity < item.quantity) {
          throw new InventoryError(
            `Insufficient available stock for product ${inventory.product.name}.`,
            'INSUFFICIENT_AVAILABLE_STOCK',
            409
          );
        }

        const updated = await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: inventory.reservedQuantity + item.quantity,
          },
          include: {
            product: true,
          },
        });

        results.push(updated);
      }

      return results;
    });
  },

  async releaseReservedStock(items: InventoryReservationItem[]) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    return prisma.$transaction(async (tx) => {
      const results: InventoryWithProduct[] = [];

      for (const item of items) {
        const quantity = Math.max(0, normalizeNumber(item.quantity, 0));

        if (!item.productId || quantity <= 0) {
          continue;
        }

        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
          include: {
            product: true,
          },
        });

        if (!inventory) {
          continue;
        }

        const nextReserved = Math.max(0, inventory.reservedQuantity - quantity);

        const updated = await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: nextReserved,
          },
          include: {
            product: true,
          },
        });

        results.push(updated);
      }

      return results;
    });
  },

  async commitReservedStock(items: InventoryReservationItem[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new InventoryError('Commit items are required.', 'INVALID_COMMIT_ITEMS', 400);
    }

    return prisma.$transaction(async (tx) => {
      const results: InventoryWithProduct[] = [];

      for (const item of items) {
        const quantity = Math.max(0, normalizeNumber(item.quantity, 0));

        if (!item.productId || quantity <= 0) {
          throw new InventoryError(
            'Each commit item must include a valid product ID and quantity.',
            'INVALID_COMMIT_ITEM',
            400
          );
        }

        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
          include: {
            product: true,
          },
        });

        if (!inventory) {
          throw new InventoryError(
            `Inventory record not found for product ${item.productId}.`,
            'INVENTORY_NOT_FOUND',
            404
          );
        }

        if (inventory.reservedQuantity < quantity) {
          throw new InventoryError(
            `Reserved stock is insufficient for product ${inventory.product.name}.`,
            'INSUFFICIENT_RESERVED_STOCK',
            409
          );
        }

        if (inventory.quantity < quantity) {
          throw new InventoryError(
            `Stock is insufficient for product ${inventory.product.name}.`,
            'INSUFFICIENT_STOCK',
            409
          );
        }

        const nextQuantity = inventory.quantity - quantity;
        const nextReserved = inventory.reservedQuantity - quantity;
        const nextStatus = resolveStatus(nextQuantity, inventory.lowStockThreshold);

        const updated = await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: nextQuantity,
            reservedQuantity: nextReserved,
            status: nextStatus,
          },
          include: {
            product: true,
          },
        });

        results.push(updated);
      }

      return results;
    });
  },

  async hasSufficientStock(productId: string, quantity: number) {
    if (!productId || quantity <= 0) {
      return false;
    }

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      return false;
    }

    return inventory.quantity - inventory.reservedQuantity >= quantity;
  },

  async getLowStockItems(limit = 20) {
    const take = Math.min(100, Math.max(1, limit));

    return prisma.inventory.findMany({
      where: {
        OR: [
          { status: InventoryStatus.LOW_STOCK },
          { status: InventoryStatus.OUT_OF_STOCK },
        ],
      },
      include: {
        product: true,
      },
      orderBy: [{ status: 'desc' }, { quantity: 'asc' }, { updatedAt: 'desc' }],
      take,
    });
  },

  async getInventorySummary(): Promise<InventorySummary> {
    const [aggregate, lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
      prisma.inventory.aggregate({
        _sum: {
          quantity: true,
        },
      }),
      prisma.inventory.count({
        where: {
          status: InventoryStatus.LOW_STOCK,
        },
      }),
      prisma.inventory.count({
        where: {
          status: InventoryStatus.OUT_OF_STOCK,
        },
      }),
      prisma.inventory.count(),
    ]);

    return {
      totalProducts,
      totalUnitsInStock: aggregate._sum.quantity || 0,
      lowStockCount,
      outOfStockCount,
    };
  },

  async syncInventoryStatuses() {
    const inventories = await prisma.inventory.findMany();

    if (inventories.length === 0) {
      return [];
    }

    return prisma.$transaction(
      inventories.map((inventory) =>
        prisma.inventory.update({
          where: { id: inventory.id },
          data: {
            status: resolveStatus(inventory.quantity, inventory.lowStockThreshold),
            reservedQuantity: Math.min(inventory.reservedQuantity, inventory.quantity),
          },
        })
      )
    );
  },
};

export default inventoryService;