import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "@/lib/sendgrid";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const emailNotificationSchema = z.object({
  type: z.enum(["order_confirmation", "shipping_update", "low_stock_alert", "custom"]),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(200).optional(),
  orderId: z.string().optional(),
  productId: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  carrier: z.string().max(100).optional(),
  message: z.string().max(5000).optional(),
  metadata: z.record(z.any()).optional(),
});

type NotificationType = z.infer<typeof emailNotificationSchema>["type"];

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function buildBaseEmailLayout(title: string, content: string) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Modern E-Commerce";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="padding:24px 24px 8px;background:#0f172a;color:#ffffff;">
              <h1 style="margin:0;font-size:24px;line-height:32px;">${escapeHtml(appName)}</h1>
            </div>
            <div style="padding:24px;">
              ${content}
            </div>
          </div>
          <div style="padding:16px 8px 0;color:#64748b;font-size:12px;line-height:18px;text-align:center;">
            <p style="margin:0 0 6px;">This email was sent by ${escapeHtml(appName)}.</p>
            <p style="margin:0;">Questions? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(supportEmail)}</a>.</p>
            <p style="margin:6px 0 0;">© ${year} ${escapeHtml(appName)}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function buildOrderConfirmationEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
    },
  });

  if (!order) {
    return null;
  }

  const currency = (order as { currency?: string }).currency || "USD";
  const itemsHtml = order.items
    .map((item) => {
      const itemName =
        item.product?.name || (item as { productName?: string }).productName || "Product";
      const price =
        typeof item.price === "number"
          ? item.price
          : Number(item.price || 0);

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:600;">${escapeHtml(itemName)}</div>
            <div style="font-size:13px;color:#64748b;">Qty: ${item.quantity}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">
            ${escapeHtml(formatCurrency(price * item.quantity, currency))}
          </td>
        </tr>
      `;
    })
    .join("");

  const total =
    typeof order.total === "number" ? order.total : Number(order.total || 0);

  const html = buildBaseEmailLayout(
    "Order Confirmation",
    `
      <h2 style="margin:0 0 12px;font-size:22px;line-height:30px;">Thanks for your order</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
        We have received your order <strong>#${escapeHtml(order.id)}</strong> and it is now being processed.
      </p>
      <table width="100%" cellPadding="0" cellSpacing="0" style="border-collapse:collapse;margin:16px 0;">
        ${itemsHtml}
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:right;">
        <span style="font-size:14px;color:#64748b;">Order Total</span><br />
        <strong style="font-size:20px;">${escapeHtml(formatCurrency(total, currency))}</strong>
      </div>
    `,
  );

  return {
    to: order.user?.email || "",
    subject: `Order confirmation #${order.id}`,
    html,
    order,
  };
}

async function buildShippingUpdateEmail(orderId: string, payload: z.infer<typeof emailNotificationSchema>) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
    },
  });

  if (!order) {
    return null;
  }

  const trackingNumber = payload.trackingNumber || "Pending";
  const carrier = payload.carrier || "Shipping Provider";
  const trackingUrl = payload.trackingUrl || "";
  const trackingLink = trackingUrl
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Track your package</a></p>`
    : "";

  const html = buildBaseEmailLayout(
    "Shipping Update",
    `
      <h2 style="margin:0 0 12px;font-size:22px;line-height:30px;">Your order is on the way</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
        Great news — your order <strong>#${escapeHtml(order.id)}</strong> has shipped.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
        <p style="margin:0 0 8px;"><strong>Carrier:</strong> ${escapeHtml(carrier)}</p>
        <p style="margin:0;"><strong>Tracking number:</strong> ${escapeHtml(trackingNumber)}</p>
      </div>
      ${trackingLink}
    `,
  );

  return {
    to: order.user?.email || "",
    subject: `Shipping update for order #${order.id}`,
    html,
    order,
  };
}

async function buildLowStockAlertEmail(productId: string, payload: z.infer<typeof emailNotificationSchema>) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return null;
  }

  const inventoryRecord = await prisma.inventory.findUnique({
    where: { productId: product.id },
  });

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const currentStock = inventoryRecord?.quantity ?? 0;
  const threshold = (inventoryRecord as { lowStockThreshold?: number | null })?.lowStockThreshold ?? 5;

  const html = buildBaseEmailLayout(
    "Low Stock Alert",
    `
      <h2 style="margin:0 0 12px;font-size:22px;line-height:30px;">Low stock alert</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;">
        The following product is below the recommended stock threshold.
      </p>
      <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:16px;">
        <p style="margin:0 0 8px;"><strong>Product:</strong> ${escapeHtml(product.name)}</p>
        <p style="margin:0 0 8px;"><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>
        <p style="margin:0 0 8px;"><strong>Current stock:</strong> ${currentStock}</p>
        <p style="margin:0;"><strong>Threshold:</strong> ${threshold}</p>
      </div>
    `,
  );

  return {
    to: recipients,
    subject: `Low stock alert: ${product.name}`,
    html,
    product,
  };
}

function buildCustomEmail(payload: z.infer<typeof emailNotificationSchema>) {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const subject = payload.subject || "Notification";
  const message = payload.message || "You have a new notification.";

  const html = buildBaseEmailLayout(
    subject,
    `
      <h2 style="margin:0 0 12px;font-size:22px;line-height:30px;">${escapeHtml(subject)}</h2>
      <p style="margin:0;font-size:15px;line-height:24px;white-space:pre-wrap;">${escapeHtml(message)}</p>
    `,
  );

  return {
    to: recipients,
    subject,
    html,
  };
}

async function resolveEmailPayload(payload: z.infer<typeof emailNotificationSchema>) {
  const type: NotificationType = payload.type;

  switch (type) {
    case "order_confirmation":
      if (!payload.orderId) {
        return { error: "orderId is required for order_confirmation." };
      }
      return await buildOrderConfirmationEmail(payload.orderId);

    case "shipping_update":
      if (!payload.orderId) {
        return { error: "orderId is required for shipping_update." };
      }
      return await buildShippingUpdateEmail(payload.orderId, payload);

    case "low_stock_alert":
      if (!payload.productId) {
        return { error: "productId is required for low_stock_alert." };
      }
      return await buildLowStockAlertEmail(payload.productId, payload);

    case "custom":
      return buildCustomEmail(payload);

    default:
      return { error: "Unsupported notification type." };
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimit(`email_notifications:${ip}`);

    if (rateLimitResult && "success" in rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const user = await getCurrentUser();
    const isPrivilegedUser =
      !!user &&
      (user.role === "ADMIN" || user.role === "STAFF" || user.role === "MANAGER");

    if (!isPrivilegedUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = emailNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid email notification payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const resolved = await resolveEmailPayload(parsed.data);

    if (!resolved) {
      return NextResponse.json(
        { error: "Unable to build email payload." },
        { status: 404 },
      );
    }

    if ("error" in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: 400 },
      );
    }

    const recipientList = Array.isArray(resolved.to) ? resolved.to : [resolved.to];
    const filteredRecipients = recipientList.filter(Boolean);

    if (filteredRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients found for this notification." },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      to: filteredRecipients,
      subject: resolved.subject,
      html: resolved.html,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email notification sent successfully.",
        recipients: filteredRecipients,
        providerResponse: result || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/notifications/email error:", error);

    return NextResponse.json(
      {
        error: "Failed to send email notification.",
      },
      { status: 500 },
    );
  }
}