type ShippingItem = {
  name: string;
  quantity: number;
};

export type ShippingUpdateEmailProps = {
  customerName?: string;
  orderNumber: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  status?: string;
  shippedAt?: string | null;
  items?: ShippingItem[];
  supportEmail?: string;
  storeName?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatus(status?: string) {
  if (!status) return "In transit";

  return status
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getShippingUpdateEmailSubject(props: ShippingUpdateEmailProps) {
  const storeName = props.storeName || "Modern Shop";
  return `${storeName} shipping update for order #${props.orderNumber}`;
}

export function renderShippingUpdateEmail(props: ShippingUpdateEmailProps) {
  const customerName = escapeHtml(props.customerName || "Customer");
  const orderNumber = escapeHtml(props.orderNumber);
  const trackingNumber = props.trackingNumber
    ? escapeHtml(props.trackingNumber)
    : null;
  const trackingUrl = props.trackingUrl || null;
  const carrier = props.carrier ? escapeHtml(props.carrier) : "Shipping carrier";
  const estimatedDelivery = props.estimatedDelivery
    ? escapeHtml(props.estimatedDelivery)
    : null;
  const status = escapeHtml(formatStatus(props.status));
  const shippedAt = props.shippedAt ? escapeHtml(props.shippedAt) : null;
  const supportEmail = escapeHtml(props.supportEmail || "support@example.com");
  const storeName = escapeHtml(props.storeName || "Modern Shop");
  const previewText = `Your order #${orderNumber} is ${status.toLowerCase()}.`;

  const itemsHtml =
    props.items && props.items.length > 0
      ? props.items
          .map((item) => {
            const itemName = escapeHtml(item.name);
            const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;

            return `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; line-height: 20px;">
                  ${itemName}
                </td>
                <td align="right" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; line-height: 20px;">
                  Qty ${quantity}
                </td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="2" style="padding: 10px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
            Your shipment details have been updated.
          </td>
        </tr>
      `;

  const trackingSection = trackingUrl
    ? `
      <div style="margin-top: 24px; margin-bottom: 24px;">
        <a
          href="${trackingUrl}"
          style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; line-height: 20px; padding: 12px 20px; border-radius: 8px;"
        >
          Track your package
        </a>
      </div>
    `
    : "";

  const trackingDetailsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 13px; line-height: 18px; width: 160px;">Status</td>
        <td style="padding: 8px 0; color: #111827; font-size: 13px; line-height: 18px; font-weight: 600;">${status}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 13px; line-height: 18px;">Carrier</td>
        <td style="padding: 8px 0; color: #111827; font-size: 13px; line-height: 18px;">${carrier}</td>
      </tr>
      ${
        trackingNumber
          ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px; line-height: 18px;">Tracking number</td>
          <td style="padding: 8px 0; color: #111827; font-size: 13px; line-height: 18px;">${trackingNumber}</td>
        </tr>
      `
          : ""
      }
      ${
        shippedAt
          ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px; line-height: 18px;">Shipped on</td>
          <td style="padding: 8px 0; color: #111827; font-size: 13px; line-height: 18px;">${shippedAt}</td>
        </tr>
      `
          : ""
      }
      ${
        estimatedDelivery
          ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 13px; line-height: 18px;">Estimated delivery</td>
          <td style="padding: 8px 0; color: #111827; font-size: 13px; line-height: 18px;">${estimatedDelivery}</td>
        </tr>
      `
          : ""
      }
    </table>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${getShippingUpdateEmailSubject(props)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif; color: #111827;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
      ${previewText}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; margin: 0; padding: 24px 0; width: 100%;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 32px 32px 16px; background-color: #111827;">
                <p style="margin: 0; color: #d1d5db; font-size: 12px; line-height: 18px; letter-spacing: 0.08em; text-transform: uppercase;">
                  Shipping update
                </p>
                <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; line-height: 34px; font-weight: 700;">
                  Your order is on the way
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 32px;">
                <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #111827;">
                  Hi ${customerName},
                </p>

                <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #374151;">
                  We have an update for order <strong>#${orderNumber}</strong>. Your shipment status is now <strong>${status}</strong>.
                </p>

                ${trackingSection}

                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                  <h2 style="margin: 0 0 12px; font-size: 16px; line-height: 24px; color: #111827;">
                    Tracking details
                  </h2>
                  ${trackingDetailsHtml}
                </div>

                <div style="margin-top: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                  <h2 style="margin: 0 0 12px; font-size: 16px; line-height: 24px; color: #111827;">
                    Items in this shipment
                  </h2>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    ${itemsHtml}
                  </table>
                </div>

                <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #6b7280;">
                  If you have any questions, reply to this email or contact us at
                  <a href="mailto:${supportEmail}" style="color: #111827; text-decoration: underline;">${supportEmail}</a>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px 32px 32px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280;">
                  © ${new Date().getFullYear()} ${storeName}. All rights reserved.
                </p>
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

export default renderShippingUpdateEmail;