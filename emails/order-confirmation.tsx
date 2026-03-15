type OrderConfirmationItem = {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  sku?: string | null;
};

export type OrderConfirmationEmailProps = {
  customerName?: string | null;
  orderNumber: string;
  orderDate?: string | Date | null;
  items: OrderConfirmationItem[];
  subtotal: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  shippingAddress?: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  supportEmail?: string | null;
  storeName?: string | null;
  orderUrl?: string | null;
};

function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(date?: string | Date | null) {
  if (!date) return "";
  try {
    const value = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(value);
  } catch {
    return String(date);
  }
}

function getAddressLines(
  shippingAddress?: OrderConfirmationEmailProps["shippingAddress"],
) {
  if (!shippingAddress) return [];

  const cityStatePostal = [
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.postalCode,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", ,", ",");

  return [
    shippingAddress.name,
    shippingAddress.line1,
    shippingAddress.line2,
    cityStatePostal || null,
    shippingAddress.country,
  ].filter(Boolean) as string[];
}

export function renderOrderConfirmationEmail(
  props: OrderConfirmationEmailProps,
) {
  const storeName = props.storeName || "Modern Commerce";
  const customerName = props.customerName || "Customer";
  const supportEmail = props.supportEmail || "support@example.com";
  const currency = props.currency || "USD";
  const shipping = props.shipping ?? 0;
  const tax = props.tax ?? 0;
  const orderDate = formatDate(props.orderDate);
  const addressLines = getAddressLines(props.shippingAddress);

  const itemsHtml = props.items
    .map((item) => {
      const imageHtml = item.imageUrl
        ? `<td style="padding: 0 16px 16px 0; vertical-align: top; width: 72px;">
            <img src="${item.imageUrl}" alt="${item.name}" width="56" height="56" style="display: block; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb;" />
          </td>`
        : "";

      return `
        <tr>
          ${imageHtml}
          <td style="padding: 0 0 16px 0; vertical-align: top;">
            <div style="font-size: 15px; line-height: 22px; font-weight: 600; color: #111827;">${item.name}</div>
            ${
              item.sku
                ? `<div style="font-size: 13px; line-height: 20px; color: #6b7280;">SKU: ${item.sku}</div>`
                : ""
            }
            <div style="font-size: 13px; line-height: 20px; color: #6b7280;">Qty ${item.quantity}</div>
          </td>
          <td style="padding: 0 0 16px 16px; vertical-align: top; text-align: right; white-space: nowrap; font-size: 15px; line-height: 22px; font-weight: 600; color: #111827;">
            ${formatCurrency(item.price * item.quantity, currency)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif; color: #111827;">
    <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0" style="background-color: #f3f4f6; margin: 0; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #111827 0%, #1f2937 100%); color: #ffffff;">
                <div style="font-size: 14px; line-height: 20px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8;">${storeName}</div>
                <h1 style="margin: 12px 0 8px; font-size: 28px; line-height: 34px; font-weight: 700;">Thanks for your order</h1>
                <p style="margin: 0; font-size: 15px; line-height: 24px; opacity: 0.9;">Hi ${customerName}, we’ve received your order and it’s now being processed.</p>
              </td>
            </tr>

            <tr>
              <td style="padding: 24px 32px 8px;">
                <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0">
                  <tr>
                    <td style="padding: 0 0 16px; vertical-align: top;">
                      <div style="font-size: 13px; line-height: 18px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">Order number</div>
                      <div style="font-size: 16px; line-height: 24px; font-weight: 600; color: #111827;">#${props.orderNumber}</div>
                    </td>
                    ${
                      orderDate
                        ? `<td style="padding: 0 0 16px; vertical-align: top;">
                            <div style="font-size: 13px; line-height: 18px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">Order date</div>
                            <div style="font-size: 16px; line-height: 24px; font-weight: 600; color: #111827;">${orderDate}</div>
                          </td>`
                        : ""
                    }
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 32px 0;">
                <h2 style="margin: 0 0 16px; font-size: 18px; line-height: 28px; color: #111827;">Order summary</h2>
                <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0">
                  ${itemsHtml}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 32px 0;">
                <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0" style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; line-height: 22px; color: #6b7280;">Subtotal</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 14px; line-height: 22px; color: #111827;">${formatCurrency(props.subtotal, currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; line-height: 22px; color: #6b7280;">Shipping</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 14px; line-height: 22px; color: #111827;">${shipping === 0 ? "Free" : formatCurrency(shipping, currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; line-height: 22px; color: #6b7280;">Tax</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 14px; line-height: 22px; color: #111827;">${formatCurrency(tax, currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0; font-size: 16px; line-height: 24px; font-weight: 700; color: #111827;">Total</td>
                    <td style="padding: 12px 0 0; text-align: right; font-size: 16px; line-height: 24px; font-weight: 700; color: #111827;">${formatCurrency(props.total, currency)}</td>
                  </tr>
                </table>
              </td>
            </tr>

            ${
              addressLines.length > 0
                ? `
            <tr>
              <td style="padding: 24px 32px 0;">
                <h2 style="margin: 0 0 12px; font-size: 18px; line-height: 28px; color: #111827;">Shipping address</h2>
                <div style="font-size: 14px; line-height: 24px; color: #374151;">
                  ${addressLines.join("<br />")}
                </div>
              </td>
            </tr>`
                : ""
            }

            ${
              props.orderUrl
                ? `
            <tr>
              <td style="padding: 28px 32px 8px;">
                <a href="${props.orderUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 10px; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 14px; line-height: 20px; font-weight: 600;">
                  View your order
                </a>
              </td>
            </tr>`
                : ""
            }

            <tr>
              <td style="padding: 24px 32px 32px;">
                <p style="margin: 0 0 12px; font-size: 14px; line-height: 24px; color: #4b5563;">
                  We’ll send another email as soon as your order ships.
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 24px; color: #4b5563;">
                  Need help? Contact us at
                  <a href="mailto:${supportEmail}" style="color: #111827; font-weight: 600; text-decoration: none;">${supportEmail}</a>.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellSpacing="0" cellPadding="0" border="0" style="max-width: 640px;">
            <tr>
              <td style="padding: 16px 24px 0; text-align: center; font-size: 12px; line-height: 18px; color: #6b7280;">
                © ${new Date().getFullYear()} ${storeName}. All rights reserved.
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

export default renderOrderConfirmationEmail;