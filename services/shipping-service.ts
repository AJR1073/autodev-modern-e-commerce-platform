import { prisma } from '@/lib/prisma';

export type ShippingAddress = {
  name?: string | null;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
};

export type ShippingPackageItem = {
  productId?: string;
  sku?: string | null;
  name: string;
  quantity: number;
  unitWeightKg?: number | null;
  unitPrice?: number | null;
};

export type ShippingPackage = {
  items: ShippingPackageItem[];
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  insuredValue?: number | null;
};

export type ShippingRate = {
  provider: string;
  service: string;
  serviceCode: string;
  amount: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  estimatedDeliveryDateMin?: string;
  estimatedDeliveryDateMax?: string;
  trackingSupported: boolean;
};

export type ShipmentTrackingEvent = {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
};

export type ShipmentTracking = {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusLabel: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  events: ShipmentTrackingEvent[];
  raw?: unknown;
};

export type CreateShipmentInput = {
  orderId: string;
  carrier?: string;
  serviceCode?: string;
  shipTo?: ShippingAddress;
  shipFrom?: ShippingAddress;
  package?: ShippingPackage;
};

export type CreateShipmentResult = {
  shipmentId: string;
  orderId: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: string;
  createdAt: string;
};

type ProviderConfig = {
  name: string;
  apiKey: string;
  apiBaseUrl: string;
  defaultCarrier: string;
  trackingBaseUrl: string;
};

const providerConfig: ProviderConfig = {
  name: process.env.SHIPPING_PROVIDER_NAME || 'MockShip',
  apiKey: process.env.SHIPPING_PROVIDER_API_KEY || 'mock-shipping-api-key',
  apiBaseUrl: process.env.SHIPPING_PROVIDER_API_URL || 'https://api.mockship.local',
  defaultCarrier: process.env.SHIPPING_DEFAULT_CARRIER || 'MockShip',
  trackingBaseUrl:
    process.env.SHIPPING_TRACKING_BASE_URL || 'https://tracking.mockship.local/track',
};

const ORIGIN_ADDRESS: ShippingAddress = {
  name: process.env.SHIPPING_ORIGIN_NAME || 'Warehouse',
  company: process.env.SHIPPING_ORIGIN_COMPANY || 'Modern Commerce',
  line1: process.env.SHIPPING_ORIGIN_LINE1 || '123 Commerce St',
  line2: process.env.SHIPPING_ORIGIN_LINE2 || '',
  city: process.env.SHIPPING_ORIGIN_CITY || 'New York',
  state: process.env.SHIPPING_ORIGIN_STATE || 'NY',
  postalCode: process.env.SHIPPING_ORIGIN_POSTAL_CODE || '10001',
  country: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
  phone: process.env.SHIPPING_ORIGIN_PHONE || '',
};

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'USD';

function addBusinessDays(startDate: Date, businessDays: number): Date {
  const date = new Date(startDate);
  let added = 0;

  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return date;
}

function startOfDayIso(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeCountry(country?: string | null): string {
  return (country || 'US').trim().toUpperCase();
}

function getZoneMultiplier(destinationCountry: string): number {
  const country = normalizeCountry(destinationCountry);

  if (country === 'US') return 1;
  if (country === 'CA' || country === 'MX') return 1.35;
  return 2.1;
}

function getTotalItemQuantity(items: ShippingPackageItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(item.quantity || 0, 0), 0);
}

function calculateWeightKg(pkg?: ShippingPackage | null): number {
  if (pkg?.weightKg && pkg.weightKg > 0) {
    return pkg.weightKg;
  }

  const items = pkg?.items || [];
  const computed = items.reduce((sum, item) => {
    const unitWeight = item.unitWeightKg && item.unitWeightKg > 0 ? item.unitWeightKg : 0.25;
    return sum + unitWeight * Math.max(item.quantity || 0, 0);
  }, 0);

  return Math.max(computed, 0.25);
}

function calculateInsuredValue(pkg?: ShippingPackage | null): number {
  if (pkg?.insuredValue && pkg.insuredValue > 0) {
    return pkg.insuredValue;
  }

  const items = pkg?.items || [];
  return items.reduce((sum, item) => {
    const value = item.unitPrice && item.unitPrice > 0 ? item.unitPrice : 0;
    return sum + value * Math.max(item.quantity || 0, 0);
  }, 0);
}

function estimateRates(
  destinationCountry: string,
  pkg?: ShippingPackage | null,
): ShippingRate[] {
  const weightKg = calculateWeightKg(pkg);
  const insuredValue = calculateInsuredValue(pkg);
  const itemCount = getTotalItemQuantity(pkg?.items || []);
  const zoneMultiplier = getZoneMultiplier(destinationCountry);

  const baseGround = 6.5;
  const baseExpress = 14.5;
  const basePriority = 24.0;

  const weightSurcharge = Math.max(weightKg - 0.5, 0) * 2.75;
  const handlingSurcharge = itemCount > 0 ? Math.min(itemCount * 0.35, 4.5) : 0.35;
  const insuranceSurcharge = insuredValue > 100 ? (insuredValue - 100) * 0.0125 : 0;

  const now = new Date();

  const rates: ShippingRate[] = [
    {
      provider: providerConfig.name,
      service: 'Standard',
      serviceCode: 'standard',
      amount: Number(
        (baseGround * zoneMultiplier + weightSurcharge + handlingSurcharge + insuranceSurcharge).toFixed(
          2,
        ),
      ),
      currency: DEFAULT_CURRENCY,
      estimatedDaysMin: destinationCountry === 'US' ? 3 : 6,
      estimatedDaysMax: destinationCountry === 'US' ? 7 : 12,
      estimatedDeliveryDateMin: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 3 : 6),
      ),
      estimatedDeliveryDateMax: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 7 : 12),
      ),
      trackingSupported: true,
    },
    {
      provider: providerConfig.name,
      service: 'Express',
      serviceCode: 'express',
      amount: Number(
        (baseExpress * zoneMultiplier + weightSurcharge * 1.1 + handlingSurcharge + insuranceSurcharge).toFixed(
          2,
        ),
      ),
      currency: DEFAULT_CURRENCY,
      estimatedDaysMin: destinationCountry === 'US' ? 2 : 4,
      estimatedDaysMax: destinationCountry === 'US' ? 3 : 6,
      estimatedDeliveryDateMin: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 2 : 4),
      ),
      estimatedDeliveryDateMax: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 3 : 6),
      ),
      trackingSupported: true,
    },
    {
      provider: providerConfig.name,
      service: 'Priority',
      serviceCode: 'priority',
      amount: Number(
        (basePriority * zoneMultiplier + weightSurcharge * 1.2 + handlingSurcharge + insuranceSurcharge).toFixed(
          2,
        ),
      ),
      currency: DEFAULT_CURRENCY,
      estimatedDaysMin: destinationCountry === 'US' ? 1 : 2,
      estimatedDaysMax: destinationCountry === 'US' ? 2 : 4,
      estimatedDeliveryDateMin: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 1 : 2),
      ),
      estimatedDeliveryDateMax: startOfDayIso(
        addBusinessDays(now, destinationCountry === 'US' ? 2 : 4),
      ),
      trackingSupported: true,
    },
  ];

  return rates.map((rate) => ({
    ...rate,
    amount: Number(clampNumber(rate.amount, 0, 99999).toFixed(2)),
  }));
}

function buildTrackingNumber(orderId: string, carrier: string): string {
  const prefix = carrier.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'SHIP';
  const orderFragment = orderId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-8) || 'ORDER';
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}${orderFragment}${timestamp}`;
}

function buildTrackingUrl(trackingNumber: string): string {
  const base = providerConfig.trackingBaseUrl.replace(/\/$/, '');
  return `${base}/${encodeURIComponent(trackingNumber)}`;
}

async function resolveOrderShippingContext(orderId: string) {
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
    throw new Error('Order not found');
  }

  const shippingAddress = (() => {
    const shipping = order.shippingAddress as Record<string, unknown> | null;
    if (!shipping) return null;

    return {
      name: typeof shipping.name === 'string' ? shipping.name : order.user?.name || 'Customer',
      company: typeof shipping.company === 'string' ? shipping.company : '',
      line1:
        typeof shipping.line1 === 'string'
          ? shipping.line1
          : typeof shipping.addressLine1 === 'string'
            ? shipping.addressLine1
            : '',
      line2:
        typeof shipping.line2 === 'string'
          ? shipping.line2
          : typeof shipping.addressLine2 === 'string'
            ? shipping.addressLine2
            : '',
      city: typeof shipping.city === 'string' ? shipping.city : '',
      state: typeof shipping.state === 'string' ? shipping.state : '',
      postalCode:
        typeof shipping.postalCode === 'string'
          ? shipping.postalCode
          : typeof shipping.zip === 'string'
            ? shipping.zip
            : '',
      country: typeof shipping.country === 'string' ? shipping.country : 'US',
      phone: typeof shipping.phone === 'string' ? shipping.phone : order.user?.phone || '',
    } satisfies ShippingAddress;
  })();

  const packageItems: ShippingPackageItem[] = order.items.map((item) => ({
    productId: item.productId,
    sku: item.product?.sku || null,
    name: item.productName,
    quantity: item.quantity,
    unitWeightKg: item.product?.weight ? Number(item.product.weight) : 0.25,
    unitPrice: Number(item.unitPrice),
  }));

  const pkg: ShippingPackage = {
    items: packageItems,
    insuredValue: Number(order.totalAmount),
  };

  return {
    order,
    shipTo: shippingAddress,
    shipFrom: ORIGIN_ADDRESS,
    package: pkg,
  };
}

export class ShippingService {
  static async getRates(params: {
    destination: ShippingAddress;
    package: ShippingPackage;
  }): Promise<ShippingRate[]> {
    return estimateRates(params.destination.country, params.package);
  }

  static async getRatesForOrder(orderId: string): Promise<ShippingRate[]> {
    const context = await resolveOrderShippingContext(orderId);

    if (!context.shipTo) {
      return estimateRates('US', context.package);
    }

    return estimateRates(context.shipTo.country, context.package);
  }

  static async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const context = await resolveOrderShippingContext(input.orderId);

    const carrier = input.carrier || providerConfig.defaultCarrier;
    const shipTo = input.shipTo || context.shipTo;
    const selectedPackage = input.package || context.package;

    if (!shipTo) {
      throw new Error('Shipping address is required to create a shipment');
    }

    const availableRates = estimateRates(shipTo.country, selectedPackage);
    const selectedRate =
      availableRates.find((rate) => rate.serviceCode === input.serviceCode) || availableRates[0];

    const trackingNumber = buildTrackingNumber(input.orderId, carrier);
    const trackingUrl = buildTrackingUrl(trackingNumber);
    const shipmentId = `shp_${trackingNumber.toLowerCase()}`;
    const now = new Date().toISOString();

    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: 'SHIPPED',
        shippingCarrier: carrier,
        shippingMethod: selectedRate?.service || 'Standard',
        trackingNumber,
        shippedAt: new Date(),
      },
    });

    return {
      shipmentId,
      orderId: input.orderId,
      carrier,
      service: selectedRate?.service || 'Standard',
      trackingNumber,
      trackingUrl,
      labelUrl: `${providerConfig.apiBaseUrl.replace(/\/$/, '')}/labels/${encodeURIComponent(
        shipmentId,
      )}.pdf`,
      status: 'label_created',
      createdAt: now,
    };
  }

  static async getTracking(trackingNumber: string): Promise<ShipmentTracking> {
    const order = await prisma.order.findFirst({
      where: { trackingNumber },
      select: {
        id: true,
        createdAt: true,
        shippedAt: true,
        deliveredAt: true,
        shippingCarrier: true,
        status: true,
        trackingNumber: true,
      },
    });

    const carrier = order?.shippingCarrier || providerConfig.defaultCarrier;
    const shippedAt = order?.shippedAt || new Date();
    const estimatedDelivery = addBusinessDays(
      shippedAt,
      order?.status === 'DELIVERED' ? 0 : 4,
    );

    const events: ShipmentTrackingEvent[] = [
      {
        status: 'label_created',
        description: 'Shipping label created',
        timestamp: order?.createdAt?.toISOString() || new Date().toISOString(),
      },
      {
        status: 'in_transit',
        description: 'Package accepted by carrier',
        location: ORIGIN_ADDRESS.city,
        timestamp: shippedAt.toISOString(),
      },
    ];

    let status = 'IN_TRANSIT';
    let statusLabel = 'In transit';

    if (order?.status === 'DELIVERED' && order.deliveredAt) {
      status = 'DELIVERED';
      statusLabel = 'Delivered';
      events.push({
        status: 'delivered',
        description: 'Package delivered',
        timestamp: order.deliveredAt.toISOString(),
      });
    } else {
      events.push({
        status: 'out_for_delivery',
        description: 'Package is moving through the delivery network',
        timestamp: addBusinessDays(shippedAt, 2).toISOString(),
      });
    }

    return {
      trackingNumber,
      carrier,
      status,
      statusLabel,
      trackingUrl: buildTrackingUrl(trackingNumber),
      estimatedDeliveryDate: order?.deliveredAt?.toISOString() || estimatedDelivery.toISOString(),
      events,
      raw: order || null,
    };
  }

  static async markDelivered(orderId: string) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    return order;
  }
}

export const shippingService = ShippingService;