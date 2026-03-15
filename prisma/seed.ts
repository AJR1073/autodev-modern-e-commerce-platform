import { PrismaClient, OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const passwordHash = await hash('Admin123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Store Admin',
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      email: 'admin@example.com',
      name: 'Store Admin',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      name: 'Jane Customer',
      role: Role.CUSTOMER,
      passwordHash: await hash('Customer123!', 10),
    },
    create: {
      email: 'customer@example.com',
      name: 'Jane Customer',
      role: Role.CUSTOMER,
      passwordHash: await hash('Customer123!', 10),
    },
  });

  const categories = [
    {
      name: 'Electronics',
      description: 'Smart devices and everyday tech essentials.',
      imageUrl:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Home Office',
      description: 'Furniture and accessories for productive workspaces.',
      imageUrl:
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Accessories',
      description: 'Functional add-ons that complement your setup.',
      imageUrl:
        'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Audio',
      description: 'Immersive sound gear for music, calls, and focus.',
      imageUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const categoryMap = new Map<string, { id: string; slug: string }>();

  for (const category of categories) {
    const slug = slugify(category.name);

    const record = await prisma.category.upsert({
      where: { slug },
      update: {
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
      },
      create: {
        name: category.name,
        slug,
        description: category.description,
        imageUrl: category.imageUrl,
      },
    });

    categoryMap.set(category.name, { id: record.id, slug: record.slug });
  }

  const products = [
    {
      name: 'Aero Wireless Headphones',
      sku: 'AUD-AERO-001',
      categoryName: 'Audio',
      price: 12999,
      compareAtPrice: 15999,
      stock: 42,
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Lightweight wireless headphones with all-day comfort.',
      description:
        'The Aero Wireless Headphones combine rich sound, a balanced profile, and soft over-ear cushions for everyday listening. Ideal for commuting, focused work, or relaxing at home.',
    },
    {
      name: 'Nova Mechanical Keyboard',
      sku: 'ACC-NOVA-002',
      categoryName: 'Accessories',
      price: 8999,
      compareAtPrice: 10999,
      stock: 58,
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Tactile mechanical keyboard designed for speed and comfort.',
      description:
        'Built for creators and professionals, the Nova Mechanical Keyboard features responsive switches, durable keycaps, and a compact layout that keeps your desk clean and efficient.',
    },
    {
      name: 'Luma 4K Monitor 27"',
      sku: 'ELE-LUMA-003',
      categoryName: 'Electronics',
      price: 32999,
      compareAtPrice: 37999,
      stock: 21,
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Ultra-clear 4K display for work, design, and entertainment.',
      description:
        'The Luma 4K Monitor delivers crisp visuals, wide color coverage, and a modern edge-to-edge design. A strong fit for productivity, content creation, and immersive media viewing.',
    },
    {
      name: 'Atlas Standing Desk',
      sku: 'HOM-ATLAS-004',
      categoryName: 'Home Office',
      price: 45999,
      compareAtPrice: 51999,
      stock: 14,
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Height-adjustable desk that supports healthier work habits.',
      description:
        'Transition smoothly between sitting and standing with the Atlas Standing Desk. Its sturdy frame, spacious top, and clean cable management make it ideal for modern workspaces.',
    },
    {
      name: 'Orbit USB-C Dock',
      sku: 'ELE-ORBIT-005',
      categoryName: 'Electronics',
      price: 7499,
      compareAtPrice: 8999,
      stock: 67,
      featured: false,
      images: [
        'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Expand ports instantly with a sleek multi-device dock.',
      description:
        'The Orbit USB-C Dock adds HDMI, USB, Ethernet, and card-reader support in one compact accessory. Perfect for laptops and hybrid work setups.',
    },
    {
      name: 'Pulse Bluetooth Speaker',
      sku: 'AUD-PULSE-006',
      categoryName: 'Audio',
      price: 6999,
      compareAtPrice: 8499,
      stock: 33,
      featured: false,
      images: [
        'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Portable speaker with room-filling sound and long battery life.',
      description:
        'Enjoy punchy audio and a minimalist design with the Pulse Bluetooth Speaker. Built for casual listening at home, outdoors, or wherever the day takes you.',
    },
    {
      name: 'Arc Desk Lamp',
      sku: 'HOM-ARC-007',
      categoryName: 'Home Office',
      price: 4999,
      compareAtPrice: 5999,
      stock: 49,
      featured: false,
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Adjustable lighting with a clean silhouette for any desk.',
      description:
        'The Arc Desk Lamp provides focused illumination with adjustable brightness and angle control. A practical upgrade for late-night work sessions and reading corners.',
    },
    {
      name: 'Comet Wireless Mouse',
      sku: 'ACC-COMET-008',
      categoryName: 'Accessories',
      price: 3999,
      compareAtPrice: 4999,
      stock: 76,
      featured: false,
      images: [
        'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80',
      ],
      shortDescription: 'Ergonomic wireless mouse for smooth, precise navigation.',
      description:
        'Designed for daily productivity, the Comet Wireless Mouse features a comfortable shape, accurate tracking, and dependable battery performance.',
    },
  ];

  const createdProducts: Array<{ id: string; price: number; stock: number; name: string }> = [];

  for (const product of products) {
    const slug = slugify(product.name);
    const category = categoryMap.get(product.categoryName);

    if (!category) {
      continue;
    }

    const record = await prisma.product.upsert({
      where: { slug },
      update: {
        name: product.name,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        featured: product.featured,
        categoryId: category.id,
        images: product.images,
        isActive: true,
      },
      create: {
        name: product.name,
        slug,
        sku: product.sku,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        featured: product.featured,
        categoryId: category.id,
        images: product.images,
        isActive: true,
      },
    });

    createdProducts.push({
      id: record.id,
      price: product.price,
      stock: product.stock,
      name: product.name,
    });
  }

  if (createdProducts.length >= 3) {
    const orderSlug = `ORD-${Date.now()}`;

    const existingOrder = await prisma.order.findFirst({
      where: {
        orderNumber: orderSlug,
      },
    });

    if (!existingOrder) {
      const first = createdProducts[0];
      const second = createdProducts[1];
      const third = createdProducts[2];

      const subtotal = first.price * 1 + second.price * 1 + third.price * 2;
      const shippingAmount = 1299;
      const taxAmount = Math.round(subtotal * 0.08);
      const totalAmount = subtotal + shippingAmount + taxAmount;

      await prisma.order.create({
        data: {
          orderNumber: orderSlug,
          userId: customerUser.id,
          email: customerUser.email,
          status: OrderStatus.PROCESSING,
          paymentStatus: PaymentStatus.PAID,
          subtotalAmount: subtotal,
          taxAmount,
          shippingAmount,
          totalAmount,
          currency: 'usd',
          shippingName: 'Jane Customer',
          shippingLine1: '123 Market Street',
          shippingLine2: 'Suite 400',
          shippingCity: 'San Francisco',
          shippingState: 'CA',
          shippingPostalCode: '94105',
          shippingCountry: 'US',
          billingName: 'Jane Customer',
          billingLine1: '123 Market Street',
          billingLine2: 'Suite 400',
          billingCity: 'San Francisco',
          billingState: 'CA',
          billingPostalCode: '94105',
          billingCountry: 'US',
          items: {
            create: [
              {
                productId: first.id,
                quantity: 1,
                unitPrice: first.price,
                totalPrice: first.price,
                productName: first.name,
              },
              {
                productId: second.id,
                quantity: 1,
                unitPrice: second.price,
                totalPrice: second.price,
                productName: second.name,
              },
              {
                productId: third.id,
                quantity: 2,
                unitPrice: third.price,
                totalPrice: third.price * 2,
                productName: third.name,
              },
            ],
          },
        },
      });
    }
  }

  console.log('Database seeded successfully.');
  console.log(`Admin user: ${adminUser.email} / Admin123!`);
  console.log(`Customer user: ${customerUser.email} / Customer123!`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });