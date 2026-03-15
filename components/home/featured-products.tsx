import Link from 'next/link';

import { getFeaturedProducts } from '@/services/product-service';
import { ProductCard } from '@/components/products/product-card';
import { Button } from '@/components/ui/button';

export async function FeaturedProducts() {
  const products = await getFeaturedProducts(4);

  return (
    <section
      aria-labelledby="featured-products-heading"
      className="bg-white py-16 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
              Featured collection
            </span>
            <div className="space-y-2">
              <h2
                id="featured-products-heading"
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              >
                Popular picks for modern shoppers
              </h2>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                Explore a curated selection of customer favorites chosen for quality,
                value, and everyday performance.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/products">Browse all products</Link>
          </Button>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No featured products yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;re preparing our newest arrivals. Check back soon or explore the full
              catalog now.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/products">Shop the catalog</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}