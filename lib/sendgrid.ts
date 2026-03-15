import sgMail from '@sendgrid/mail';

export type EmailAddress = {
  email: string;
  name?: string;
};

export type SendEmailOptions = {
  to: string | EmailAddress | Array<string | EmailAddress>;
  subject: string;
  html: string;
  text?: string;
  from?: string | EmailAddress;
  replyTo?: string | EmailAddress;
  categories?: string[];
  customArgs?: Record<string, string>;
};

export type OrderConfirmationEmailData = {
  orderNumber: string;
  customerName?: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  orderUrl?: string;
};

export type ShippingUpdateEmailData = {
  customerEmail: string;
  customerName?: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  orderUrl?: string;
};

export type LowStockAlertEmailData = {
  productName: string;
  sku?: string;
  stock: number;
  threshold?: number;
  adminEmail?: string;
  dashboardUrl?: string;
};

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Modern Store';
const SENDGRID_ADMIN_EMAIL = process.env.SENDGRID_ADMIN_EMAIL || SENDGRID_FROM_EMAIL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let configured = false;

function ensureConfigured() {
  if (!configured && SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    configured = true;
  }
}

function normalizeAddress(address?: string | EmailAddress): string | { email: string; name?: string } {
  if (!address) {
    return {
      email: SENDGRID_FROM_EMAIL,
      name: SENDGRID_FROM_NAME,
    };
  }

  if (typeof address === 'string') {
    return address;
  }

  return {
    email: address.email,
    name: address.name,
  };
}

function normalizeRecipients(
  recipients: string | EmailAddress | Array<string | EmailAddress>,
): Array<string | { email: string; name?: string }> {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list.map((recipient) => normalizeAddress(recipient));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isSendGridEnabled() {
  return Boolean(SENDGRID_API_KEY);
}

export async function sendEmail(options: SendEmailOptions) {
  if (!isSendGridEnabled()) {
    console.warn('SendGrid email skipped: SENDGRID_API_KEY is not configured.', {
      to: options.to,
      subject: options.subject,
    });

    return {
      success: false,
      skipped: true,
      messageId: null as string | null,
    };
  }

  ensureConfigured();

  try {
    const response = await sgMail.send({
      to: normalizeRecipients(options.to),
      from: normalizeAddress(options.from),
      replyTo: options.replyTo ? normalizeAddress(options.replyTo) : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      categories: options.categories,
      customArgs: options.customArgs,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false,
        },
        openTracking: {
          enable: false,
        },
      },
    });

    const headers = response?.[0]?.headers as Record<string, string> | undefined;
    const messageId = headers?.['x-message-id'] || headers?.['X-Message-Id'] || null;

    return {
      success: true,
      skipped: false,
      messageId,
    };
  } catch (error) {
    console.error('Failed to send email via SendGrid:', error);
    return {
      success: false,
      skipped: false,
      messageId: null as string | null,
      error,
    };
  }
}

function baseEmailLayout(title: string, preview: string, content: string) {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${safePreview}
    </div>
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background-color:#f8fafc;margin:0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;background-color:#111827;color:#ffffff;">
                <div style="font-size:22px;font-weight:700;">${escapeHtml(SENDGRID_FROM_NAME)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background-color:#f1f5f9;color:#475569;font-size:12px;line-height:1.6;">
                <div>This email was sent by ${escapeHtml(SENDGRID_FROM_NAME)}.</div>
                <div style="margin-top:4px;">If you have questions, reply to this email or visit <a href="${escapeHtml(APP_URL)}" style="color:#2563eb;">${escapeHtml(APP_URL)}</a>.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

export function buildOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const currency = data.currency || 'USD';
  const customerName = data.customerName ? escapeHtml(data.customerName) : 'there';

  const itemsHtml = data.items
    .map((item) => {
      const name = escapeHtml(item.name);
      const quantity = item.quantity;
      const lineTotal = item.price * item.quantity;

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">${name}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:center;">${quantity}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(lineTotal, currency)}</td>
        </tr>
      `;
    })
    .join('');

  const orderUrl = data.orderUrl || `${APP_URL}/account`;
  const preview = `Your order ${data.orderNumber} has been confirmed.`;

  const html = baseEmailLayout(
    `Order Confirmation #${data.orderNumber}`,
    preview,
    `
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">Thanks for your order, ${customerName}!</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        We’ve received your order <strong>#${escapeHtml(data.orderNumber)}</strong> and are preparing it for fulfillment.
      </p>

      <div style="margin:24px 0;padding:20px;border:1px solid #e2e8f0;border-radius:10px;background-color:#f8fafc;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Order summary</h2>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="font-size:14px;color:#334155;">
          <thead>
            <tr>
              <th align="left" style="padding:0 0 10px;border-bottom:1px solid #cbd5e1;">Item</th>
              <th align="center" style="padding:0 0 10px;border-bottom:1px solid #cbd5e1;">Qty</th>
              <th align="right" style="padding:0 0 10px;border-bottom:1px solid #cbd5e1;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin-top:16px;font-size:14px;color:#334155;">
          <tr>
            <td style="padding:4px 0;">Subtotal</td>
            <td align="right" style="padding:4px 0;">${formatCurrency(data.subtotal, currency)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;">Shipping</td>
            <td align="right" style="padding:4px 0;">${formatCurrency(data.shipping || 0, currency)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;">Tax</td>
            <td align="right" style="padding:4px 0;">${formatCurrency(data.tax || 0, currency)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-weight:700;color:#0f172a;">Total</td>
            <td align="right" style="padding:12px 0 0;font-weight:700;color:#0f172a;">${formatCurrency(data.total, currency)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top:24px;">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 18px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          View your order
        </a>
      </div>
    `,
  );

  const text = [
    `Thanks for your order${data.customerName ? `, ${data.customerName}` : ''}!`,
    '',
    `Order #${data.orderNumber} has been confirmed.`,
    '',
    'Items:',
    ...data.items.map(
      (item) => `- ${item.name} x${item.quantity}: ${formatCurrency(item.price * item.quantity, currency)}`,
    ),
    '',
    `Subtotal: ${formatCurrency(data.subtotal, currency)}`,
    `Shipping: ${formatCurrency(data.shipping || 0, currency)}`,
    `Tax: ${formatCurrency(data.tax || 0, currency)}`,
    `Total: ${formatCurrency(data.total, currency)}`,
    '',
    `View your order: ${orderUrl}`,
  ].join('\n');

  return {
    subject: `Order Confirmation #${data.orderNumber}`,
    html,
    text,
  };
}

export function buildShippingUpdateEmail(data: ShippingUpdateEmailData) {
  const customerName = data.customerName ? escapeHtml(data.customerName) : 'there';
  const orderUrl = data.orderUrl || `${APP_URL}/account`;
  const trackingUrl = data.trackingUrl || '';
  const preview = `Your order ${data.orderNumber} status is now ${data.status}.`;

  const html = baseEmailLayout(
    `Shipping Update for Order #${data.orderNumber}`,
    preview,
    `
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">Shipping update for ${customerName}</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        Your order <strong>#${escapeHtml(data.orderNumber)}</strong> is now marked as <strong>${escapeHtml(data.status)}</strong>.
      </p>

      ${
        data.trackingNumber
          ? `
        <div style="margin:20px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background-color:#f8fafc;">
          <div style="font-size:14px;color:#475569;">Tracking number</div>
          <div style="margin-top:6px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(data.trackingNumber)}</div>
        </div>
      `
          : ''
      }

      <div style="margin-top:24px;">
        ${
          trackingUrl
            ? `<a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 18px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Track package</a>`
            : ''
        }
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 18px;background-color:#e2e8f0;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;">
          View order
        </a>
      </div>
    `,
  );

  const text = [
    `Shipping update for order #${data.orderNumber}`,
    '',
    `Hello${data.customerName ? ` ${data.customerName}` : ''},`,
    `Your order status is now: ${data.status}`,
    data.trackingNumber ? `Tracking number: ${data.trackingNumber}` : '',
    trackingUrl ? `Track package: ${trackingUrl}` : '',
    `View order: ${orderUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Shipping Update: Order #${data.orderNumber}`,
    html,
    text,
  };
}

export function buildLowStockAlertEmail(data: LowStockAlertEmailData) {
  const dashboardUrl = data.dashboardUrl || `${APP_URL}/admin/inventory`;
  const preview = `Inventory alert: ${data.productName} is running low.`;

  const html = baseEmailLayout(
    `Low Stock Alert: ${data.productName}`,
    preview,
    `
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">Low stock alert</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        The following product is low on inventory and may need restocking soon.
      </p>

      <div style="margin:24px 0;padding:20px;border:1px solid #e2e8f0;border-radius:10px;background-color:#fef2f2;">
        <div style="font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(data.productName)}</div>
        ${
          data.sku
            ? `<div style="margin-top:6px;font-size:14px;color:#475569;">SKU: ${escapeHtml(data.sku)}</div>`
            : ''
        }
        <div style="margin-top:12px;font-size:14px;color:#475569;">Current stock</div>
        <div style="margin-top:4px;font-size:28px;font-weight:700;color:#b91c1c;">${data.stock}</div>
        ${
          typeof data.threshold === 'number'
            ? `<div style="margin-top:8px;font-size:14px;color:#475569;">Threshold: ${data.threshold}</div>`
            : ''
        }
      </div>

      <div style="margin-top:24px;">
        <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 18px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Review inventory
        </a>
      </div>
    `,
  );

  const text = [
    'Low stock alert',
    '',
    `Product: ${data.productName}`,
    data.sku ? `SKU: ${data.sku}` : '',
    `Current stock: ${data.stock}`,
    typeof data.threshold === 'number' ? `Threshold: ${data.threshold}` : '',
    `Review inventory: ${dashboardUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Low Stock Alert: ${data.productName}`,
    html,
    text,
  };
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const email = buildOrderConfirmationEmail(data);

  return sendEmail({
    to: data.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    categories: ['orders', 'order-confirmation'],
    customArgs: {
      type: 'order_confirmation',
      orderNumber: data.orderNumber,
    },
  });
}

export async function sendShippingUpdateEmail(data: ShippingUpdateEmailData) {
  const email = buildShippingUpdateEmail(data);

  return sendEmail({
    to: data.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    categories: ['orders', 'shipping-update'],
    customArgs: {
      type: 'shipping_update',
      orderNumber: data.orderNumber,
      status: data.status,
    },
  });
}

export async function sendLowStockAlertEmail(data: LowStockAlertEmailData) {
  const email = buildLowStockAlertEmail(data);

  return sendEmail({
    to: data.adminEmail || SENDGRID_ADMIN_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    categories: ['inventory', 'low-stock-alert'],
    customArgs: {
      type: 'low_stock_alert',
      productName: data.productName,
      sku: data.sku || '',
    },
  });
}