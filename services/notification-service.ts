import type { Order, OrderItem, Product, User } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/sendgrid';

type NotificationChannel = 'email';
type OrderWithRelations = Order & {
  items: Array<
    OrderItem & {
      product: Product | null;
    }
  >;
  user: User | null;
};

type ShipmentDetails = {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  estimatedDelivery?: Date | string | null;
};

type LowStockDetails = {
  productId: string;
  productName: string;
  sku?: string | null;
  currentStock: number;
  threshold?: number;
};

type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

const DEFAULT_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || DEFAULT_FROM_EMAIL;
const STORE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Modern E-Commerce Platform';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'TBD';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveCustomerEmail(order: OrderWithRelations) {
  return order.user?.email || order.email || null;
}

function buildBaseEmailLayout(title: string, preview: string, content: string) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(preview)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="background:#0f172a;padding:24px 32px;">
                    <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">${escapeHtml(STORE_NAME)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#475569;">
                      Thank you for choosing ${escapeHtml(STORE_NAME)}.
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                      Need help? Visit <a href="${escapeHtml(SITE_URL)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(SITE_URL)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildOrderItemsTable(order: OrderWithRelations) {
  const rows = order.items
    .map((item) => {
      const productName = item.product?.name || 'Product';
      const unitPrice = Number(item.price);
      const lineTotal = unitPrice * item.quantity;

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">
            ${escapeHtml(productName)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#334155;text-align:right;">
            ${formatCurrency(unitPrice)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;font-weight:600;">
            ${formatCurrency(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:24px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th align="left" style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Item</th>
          <th align="center" style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Qty</th>
          <th align="right" style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Price</th>
          <th align="right" style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function buildOrderConfirmationHtml(order: OrderWithRelations) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = order.user?.name || 'Customer';
  const total = Number(order.totalAmount);

  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${escapeHtml(customerName)},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Thanks for your order. We have received your purchase and are preparing it for fulfillment.
    </p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Status:</strong> ${escapeHtml(order.status)}</p>
      <p style="margin:0;font-size:14px;color:#475569;"><strong>Placed:</strong> ${escapeHtml(formatDate(order.createdAt))}</p>
    </div>
    ${buildOrderItemsTable(order)}
    <p style="margin:0 0 20px;font-size:18px;line-height:1.5;color:#0f172a;font-weight:700;text-align:right;">
      Order total: ${formatCurrency(total)}
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      You will receive another email when your order ships.
    </p>
  `;

  return buildBaseEmailLayout(
    `Order Confirmation - ${STORE_NAME}`,
    `Your order ${orderNumber} has been received.`,
    content,
  );
}

function buildShippingUpdateHtml(order: OrderWithRelations, shipment: ShipmentDetails) {
  const orderNumber = order.orderNumber || order.id;
  const customerName = order.user?.name || 'Customer';

  const trackingBlock =
    shipment.trackingNumber || shipment.trackingUrl
      ? `
        <div style="margin:24px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
          ${
            shipment.carrier
              ? `<p style="margin:0 0 8px;font-size:14px;color:#1e3a8a;"><strong>Carrier:</strong> ${escapeHtml(shipment.carrier)}</p>`
              : ''
          }
          ${
            shipment.trackingNumber
              ? `<p style="margin:0 0 8px;font-size:14px;color:#1e3a8a;"><strong>Tracking number:</strong> ${escapeHtml(shipment.trackingNumber)}</p>`
              : ''
          }
          <p style="margin:0;font-size:14px;color:#1e3a8a;">
            <strong>Estimated delivery:</strong> ${escapeHtml(formatDate(shipment.estimatedDelivery))}
          </p>
        </div>
        ${
          shipment.trackingUrl
            ? `
              <p style="margin:0 0 24px;">
                <a href="${escapeHtml(shipment.trackingUrl)}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Track shipment
                </a>
              </p>
            `
            : ''
        }
      `
      : `
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
          Your package is on the way. Tracking details will be shared as soon as they are available.
        </p>
      `;

  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${escapeHtml(customerName)},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Good news — your order <strong>${escapeHtml(orderNumber)}</strong> has shipped.
    </p>
    ${trackingBlock}
    ${buildOrderItemsTable(order)}
    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
      If you have any questions, reply to this email or visit our store.
    </p>
  `;

  return buildBaseEmailLayout(
    `Shipping Update - ${STORE_NAME}`,
    `Your order ${orderNumber} has shipped.`,
    content,
  );
}

function buildLowStockAlertHtml(details: LowStockDetails) {
  const productUrl = `${SITE_URL}/admin/inventory`;
  const thresholdText =
    typeof details.threshold === 'number' ? `Threshold: ${details.threshold}` : 'Threshold not configured';

  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Inventory alert for <strong>${escapeHtml(details.productName)}</strong>.
    </p>
    <div style="margin:24px 0;padding:16px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#9a3412;"><strong>Product ID:</strong> ${escapeHtml(details.productId)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#9a3412;"><strong>SKU:</strong> ${escapeHtml(details.sku || 'N/A')}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#9a3412;"><strong>Current stock:</strong> ${details.currentStock}</p>
      <p style="margin:0;font-size:14px;color:#9a3412;"><strong>${escapeHtml(thresholdText)}</strong></p>
    </div>
    <p style="margin:0;">
      <a href="${escapeHtml(productUrl)}" style="display:inline-block;padding:12px 18px;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
        Review inventory
      </a>
    </p>
  `;

  return buildBaseEmailLayout(
    `Low Stock Alert - ${STORE_NAME}`,
    `${details.productName} is running low on stock.`,
    content,
  );
}

async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<EmailSendResult> {
  try {
    const result = await sendEmail({
      to: params.to,
      from: params.from || DEFAULT_FROM_EMAIL,
      subject: params.subject,
      html: params.html,
    });

    return {
      success: true,
      messageId:
        typeof result === 'object' && result && 'messageId' in result
          ? String((result as { messageId?: string }).messageId || '')
          : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Notification email send failed:', message);

    return {
      success: false,
      error: message,
    };
  }
}

async function getOrderWithRelations(orderId: string): Promise<OrderWithRelations | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export const notificationService = {
  async sendOrderConfirmation(orderId: string, channel: NotificationChannel = 'email') {
    if (channel !== 'email') {
      return {
        success: false,
        error: `Unsupported notification channel: ${channel}`,
      };
    }

    const order = await getOrderWithRelations(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    const recipient = resolveCustomerEmail(order);

    if (!recipient) {
      return {
        success: false,
        error: 'Order customer email is missing',
      };
    }

    const subject = `Order Confirmation #${order.orderNumber || order.id}`;
    const html = buildOrderConfirmationHtml(order);

    return sendTransactionalEmail({
      to: recipient,
      subject,
      html,
    });
  },

  async sendShippingUpdate(
    orderId: string,
    shipmentDetails: ShipmentDetails = {},
    channel: NotificationChannel = 'email',
  ) {
    if (channel !== 'email') {
      return {
        success: false,
        error: `Unsupported notification channel: ${channel}`,
      };
    }

    const order = await getOrderWithRelations(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    const recipient = resolveCustomerEmail(order);

    if (!recipient) {
      return {
        success: false,
        error: 'Order customer email is missing',
      };
    }

    const subject = `Your Order #${order.orderNumber || order.id} Has Shipped`;
    const html = buildShippingUpdateHtml(order, shipmentDetails);

    return sendTransactionalEmail({
      to: recipient,
      subject,
      html,
    });
  },

  async sendLowStockAlert(details: LowStockDetails, channel: NotificationChannel = 'email') {
    if (channel !== 'email') {
      return {
        success: false,
        error: `Unsupported notification channel: ${channel}`,
      };
    }

    const html = buildLowStockAlertHtml(details);

    return sendTransactionalEmail({
      to: DEFAULT_ADMIN_EMAIL,
      subject: `Low Stock Alert: ${details.productName}`,
      html,
    });
  },

  async notifyOrderStatusChange(orderId: string, status: string) {
    const order = await getOrderWithRelations(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    if (status.toUpperCase() === 'SHIPPED') {
      return this.sendShippingUpdate(orderId);
    }

    if (status.toUpperCase() === 'CONFIRMED' || status.toUpperCase() === 'PAID') {
      return this.sendOrderConfirmation(orderId);
    }

    return {
      success: true,
      skipped: true,
    };
  },
};

export type NotificationService = typeof notificationService;