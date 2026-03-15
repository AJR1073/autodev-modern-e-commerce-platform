import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { HeroSection } from '@/components/home/hero-section';
import { FeaturedProducts } from '@/components/home/featured-products';
import { CategoryGrid } from '@/components/home/category-grid';

export const metadata = {
  title: 'Modern Commerce | Shop essentials, favorites, and new arrivals',
  description:
    'Browse featured products, shop by category, and enjoy a fast, secure, mobile-first e-commerce experience.',
};

async function getHomepageData() {
  try {
    const [featuredProducts, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 8,
        include: {
          category: true,
          inventory: true,
        },
      }),
      prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
        take: 6,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
    ]);

    return {
      featuredProducts,
      categories,
    };
  } catch {
    return {
      featuredProducts: [],
      categories: [],
    };
  }
}

export default async function HomePage() {
  const { featuredProducts, categories } = await getHomepageData();

  return (
    <div className="bg-white">
      <HeroSection />

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container mx-auto grid gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Fast fulfillment</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Order processing built for scale</p>
            <p className="mt-1 text-sm text-slate-600">Operational workflows designed to reduce delays and keep customers informed.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Secure checkout</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Trusted payments with Stripe</p>
            <p className="mt-1 text-sm text-slate-600">A smooth, mobile-friendly checkout experience with security at the core.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Inventory visibility</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Stock-aware shopping experience</p>
            <p className="mt-1 text-sm text-slate-600">Support for inventory tracking, fulfillment readiness, and low-stock workflows.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Accessibility first</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Responsive and inclusive by design</p>
            <p className="mt-1 text-sm text-slate-600">Built for clarity, performance, and easy browsing across device sizes.</p>
          </div>
        </div>
      </section>

      <CategoryGrid categories={categories} />

      <FeaturedProducts products={featuredProducts} />

      <section className="container mx-auto px-4 py-16 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl sm:p-10">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
              Built for modern commerce
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              From product discovery to fulfillment, every step is designed to convert.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Explore a product catalog optimized for browsing, a persistent cart experience, secure checkout, and
              reliable order communication. The platform is structured to support growth while keeping the buying
              experience intuitive.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Shop all products
              </Link>
              <Link
                href="/categories/all"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse categories
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">MVP priorities</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>• Searchable product catalog with category browsing</li>
                <li>• Persistent cart and streamlined checkout flow</li>
                <li>• Order tracking and admin visibility</li>
                <li>• Inventory updates and notification readiness</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Customer promise</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>• Clear product information and pricing</li>
                <li>• Mobile-first responsive experience</li>
                <li>• Secure payment handling</li>
                <li>• Transparent post-purchase communication</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="container mx-auto px-4 py-16 lg:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Ready to explore
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Discover products curated for quality, convenience, and confidence.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Start with featured selections, browse by category, or jump straight into the full catalog.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View catalog
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Review cart
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}