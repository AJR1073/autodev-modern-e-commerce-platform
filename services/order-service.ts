import { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/services/inventory-service';
import { notificationService } from '@/services/notification-service';

type OrderItemInput = {
  productId: string;
  quantity: number;
  price?: number;
};

type CreateOrderInput = {
  userId?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  items: OrderItemInput[];
  shippingAddress?: Record<string, unknown> | null;
  billingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  stripePaymentIntentId?: string | null;
  stripeSessionId?: string | null;
  currency?: string;
  metadata?: Record<string, unknown> | null;
};

type ListOrdersInput = {
  page?: number;
  limit?: number;
  status?: string | null;
  userId?: string | null;
  email?: string | null;
  search?: string | null;
};

type UpdateOrderStatusInput = {
  orderId: string;
  status: OrderStatus;
  notifyCustomer?: boolean;
};

function normalizeMoney(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function toJsonValue(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function calculateTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>,
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = 0;
  const shipping = 0;
  const total = subtotal + tax + shipping;

  return {
    subtotal,
    tax,
    shipping,
    total,
  };
}

async function findProductsForOrder(items: OrderItemInput[]) {
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];

  if (productIds.length === 0) {
    return [];
  }

  return prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    include: {
      inventory: true,
    },
  });
}

export const orderService = {
  async createOrder(input: CreateOrderInput) {
    if (!input.email?.trim()) {
      throw new Error('Customer email is required.');
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error('At least one order item is required.');
    }

    const sanitizedItems = input.items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: item.price != null ? Number(item.price) : undefined,
    }));

    const products = await findProductsForOrder(sanitizedItems);
    const productMap = new Map(products.map((product) => [product.id, product]));

    if (products.length !== sanitizedItems.length) {
      const missingProductIds = sanitizedItems
        .filter((item) => !productMap.has(item.productId))
        .map((item) => item.productId);

      throw new Error(`Some products could not be found: ${missingProductIds.join(', ')}`);
    }

    for (const item of sanitizedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const availableStock = product.inventory?.quantity ?? 0;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for product "${product.name}".`);
      }
    }

    const orderLineItems = sanitizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.price ?? normalizeMoney((product as { price?: Prisma.Decimal | number | string }).price);

      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        image: (product as { images?: unknown }).images,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const totals = calculateTotals(
      orderLineItems.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );

    const createdOrder = await prisma.$transaction(async (tx) => {
      const orderData: Prisma.OrderCreateInput = {
        email: input.email.trim().toLowerCase(),
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        phone: input.phone?.trim() || null,
        status: OrderStatus.PENDING,
        subtotal: totals.subtotal,
        taxAmount: totals.tax,
        shippingAmount: totals.shipping,
        totalAmount: totals.total,
        currency: (input.currency || 'usd').toLowerCase(),
        notes: input.notes?.trim() || null,
        shippingAddress: toJsonValue(input.shippingAddress || null),
        billingAddress: toJsonValue(input.billingAddress || null),
        metadata: toJsonValue(input.metadata || null),
        stripePaymentIntentId: input.stripePaymentIntentId || null,
        stripeSessionId: input.stripeSessionId || null,
      };

      if (input.userId) {
        (orderData as Prisma.OrderUncheckedCreateInput).userId = input.userId;
      }

      const order = await tx.order.create({
        data: {
          ...orderData,
          items: {
            create: orderLineItems.map((item) => ({
              productId: item.productId,
              productName: item.name,
              productSlug: item.slug,
              sku: item.sku,
              imageUrl: Array.isArray(item.image) ? String(item.image[0] || '') : null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of sanitizedItems) {
        const product = productMap.get(item.productId)!;
        const nextQuantity = Math.max(0, (product.inventory?.quantity ?? 0) - item.quantity);

        if (product.inventory) {
          await tx.inventory.update({
            where: {
              id: product.inventory.id,
            },
            data: {
              quantity: nextQuantity,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: product.id,
              quantity: nextQuantity,
            },
          });
        }
      }

      return order;
    });

    await Promise.allSettled(
      sanitizedItems.map(async (item) => {
        try {
          await inventoryService.ensureInventoryState(item.productId);
        } catch {
          return null;
        }
      }),
    );

    await notificationService
      .sendOrderConfirmation({
        orderId: createdOrder.id,
      })
      .catch(() => null);

    return createdOrder;
  },

  async getOrderById(orderId: string) {
    if (!orderId) {
      throw new Error('Order ID is required.');
    }

    return prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
  },

  async getOrderByStripeSessionId(stripeSessionId: string) {
    if (!stripeSessionId) {
      return null;
    }

    return prisma.order.findFirst({
      where: {
        stripeSessionId,
      },
      include: {
        items: true,
      },
    });
  },

  async listOrders(input: ListOrdersInput = {}) {
    const page = Math.max(1, Number(input.page || 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit || 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (input.status && Object.values(OrderStatus).includes(input.status as OrderStatus)) {
      where.status = input.status as OrderStatus;
    }

    if (input.userId) {
      where.userId = input.userId;
    }

    if (input.email) {
      where.email = {
        contains: input.email.trim().toLowerCase(),
        mode: 'insensitive',
      };
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          items: {
            some: {
              OR: [
                {
                  productName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  sku: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          items: true,
          user: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    };
  },

  async updateOrderStatus(input: UpdateOrderStatusInput) {
    if (!input.orderId) {
      throw new Error('Order ID is required.');
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        id: input.orderId,
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      throw new Error('Order not found.');
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: input.orderId,
      },
      data: {
        status: input.status,
      },
      include: {
        items: true,
        user: true,
      },
    });

    if (input.notifyCustomer !== false) {
      if (input.status === OrderStatus.SHIPPED || input.status === OrderStatus.DELIVERED) {
        await notificationService
          .sendShippingUpdate({
            orderId: updatedOrder.id,
            status: updatedOrder.status,
          })
          .catch(() => null);
      }
    }

    return updatedOrder;
  },

  async markOrderPaid(orderId: string, paymentData?: { stripePaymentIntentId?: string | null; stripeSessionId?: string | null }) {
    if (!orderId) {
      throw new Error('Order ID is required.');
    }

    return prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.PAID,
        stripePaymentIntentId: paymentData?.stripePaymentIntentId || undefined,
        stripeSessionId: paymentData?.stripeSessionId || undefined,
      },
      include: {
        items: true,
        user: true,
      },
    });
  },

  async cancelOrder(orderId: string, options?: { restock?: boolean; notifyCustomer?: boolean }) {
    if (!orderId) {
      throw new Error('Order ID is required.');
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error('Order not found.');
    }

    if (options?.restock !== false) {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: {
              productId: item.productId,
            },
          });

          if (inventory) {
            await tx.inventory.update({
              where: {
                id: inventory.id,
              },
              data: {
                quantity: inventory.quantity + item.quantity,
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                productId: item.productId,
                quantity: item.quantity,
              },
            });
          }
        }

        await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            status: OrderStatus.CANCELLED,
          },
        });
      });
    } else {
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });
    }

    await Promise.allSettled(
      order.items.map(async (item) => {
        try {
          await inventoryService.ensureInventoryState(item.productId);
        } catch {
          return null;
        }
      }),
    );

    return this.getOrderById(orderId);
  },

  async getOrderSummary(orderId: string) {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      status: order.status,
      email: order.email,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: normalizeMoney((order as { subtotal?: Prisma.Decimal | number | string }).subtotal),
      taxAmount: normalizeMoney((order as { taxAmount?: Prisma.Decimal | number | string }).taxAmount),
      shippingAmount: normalizeMoney((order as { shippingAmount?: Prisma.Decimal | number | string }).shippingAmount),
      totalAmount: normalizeMoney((order as { totalAmount?: Prisma.Decimal | number | string }).totalAmount),
      currency: order.currency,
      createdAt: order.createdAt,
    };
  },
};