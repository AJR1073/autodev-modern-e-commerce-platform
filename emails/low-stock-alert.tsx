export type LowStockAlertEmailProps = {
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  productUrl?: string;
  adminUrl?: string;
  warehouseLocation?: string;
  lastRestockedAt?: string | Date | null;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "Not available";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getLowStockAlertSubject({
  productName,
  currentStock,
}: Pick<LowStockAlertEmailProps, "productName" | "currentStock">) {
  return `Low stock alert: ${productName} (${currentStock} left)`;
}

export function renderLowStockAlertEmail(props: LowStockAlertEmailProps) {
  const {
    productName,
    sku,
    currentStock,
    threshold,
    productUrl,
    adminUrl,
    warehouseLocation,
    lastRestockedAt,
  } = props;

  const safeProductName = escapeHtml(productName);
  const safeSku = escapeHtml(sku);
  const safeWarehouseLocation = escapeHtml(warehouseLocation || "Primary warehouse");
  const safeProductUrl = productUrl || "#";
  const safeAdminUrl = adminUrl || "#";

  const stockStatusColor =
    currentStock <= 0 ? "#b91c1c" : currentStock <= threshold ? "#d97706" : "#2563eb";

  const stockStatusLabel =
    currentStock <= 0 ? "Out of stock" : currentStock <= threshold ? "Low stock" : "Monitor";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${getLowStockAlertSubject({ productName, currentStock })}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="width:100%;background-color:#f8fafc;padding:24px 12px;">
      <div style="max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 24px 16px;background-color:#0f172a;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;">
            Inventory Notification
          </p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;font-weight:700;">
            Low stock alert
          </h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
            ${safeProductName} has reached the configured stock threshold and may require restocking soon.
          </p>
        </div>

        <div style="padding:24px;">
          <div style="display:inline-block;padding:6px 12px;border-radius:9999px;background-color:${stockStatusColor};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.02em;">
            ${stockStatusLabel}
          </div>

          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin-top:20px;border-collapse:collapse;">
            <tr>
              <td style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background-color:#f8fafc;">
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 0 12px;font-size:14px;color:#475569;">Product</td>
                    <td style="padding:0 0 12px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeProductName}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#475569;">SKU</td>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeSku}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#475569;">Current stock</td>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:18px;color:${stockStatusColor};font-weight:700;text-align:right;">${currentStock}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#475569;">Alert threshold</td>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${threshold}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#475569;">Warehouse</td>
                    <td style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${safeWarehouseLocation}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:14px;color:#475569;">Last restocked</td>
                    <td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${formatDate(lastRestockedAt)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#475569;">
            Recommended action: review current sales velocity, confirm inbound purchase orders, and replenish inventory before availability impacts active customer orders.
          </p>

          <table role="presentation" cellPadding="0" cellSpacing="0" style="margin-top:24px;">
            <tr>
              <td style="padding-right:12px;">
                <a href="${safeAdminUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background-color:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                  View inventory dashboard
                </a>
              </td>
              <td>
                <a href="${safeProductUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background-color:#e2e8f0;color:#0f172a;text-decoration:none;font-size:14px;font-weight:700;">
                  View product
                </a>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
            This automated alert was sent by the inventory monitoring system for your e-commerce platform.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

export default renderLowStockAlertEmail;