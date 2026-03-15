import Link from "next/link";
import { Prisma } from "@prisma/client";

import { ProductFilters } from "@/components/products/product-filters";
import { ProductGrid } from "@/components/products/product-grid";
import { ProductSearch } from "@/components/products/product-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

type ProductsPageSearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
};

type ProductsPageProps = {
  searchParams?: Promise<ProductsPageSearchParams> | ProductsPageSearchParams;
};

const sortOptions: Record<string, Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]> = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSearchParams(params: ProductsPageSearchParams) {
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";
  const sort = params.sort?.trim() || "newest";
  const minPrice = parseNumber(params.minPrice);
  const maxPrice = parseNumber(params.maxPrice);
  const inStock = params.inStock === "true";

  return {
    q,
    category,
    sort: sortOptions[sort] ? sort : "newest",
    minPrice,
    maxPrice,
    inStock,
  };
}

export const metadata = {
  title: "Products",
  description:
    "Browse our product catalog with search, category filters, inventory-aware availability, and flexible sorting.",
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<ProductsPageSearchParams>).then === "function"
      ? await (searchParams as Promise<ProductsPageSearchParams>)
      : (searchParams as ProductsPageSearchParams) || {};

  const filters = normalizeSearchParams(resolvedSearchParams);

  const where: Prisma.ProductWhereInput = {
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { sku: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.category
      ? {
          category: {
            slug: filters.category,
          },
        }
      : {}),
    ...(typeof filters.minPrice === "number" || typeof filters.maxPrice === "number"
      ? {
          price: {
            ...(typeof filters.minPrice === "number" ? { gte: filters.minPrice } : {}),
            ...(typeof filters.maxPrice === "number" ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.inStock
      ? {
          inventory: {
            some: {
              quantity: {
                gt: 0,
              },
            },
          },
        }
      : {}),
  };

  const [products, categories, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy: sortOptions[filters.sort],
    }),
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const activeFilterCount = [
    filters.q ? 1 : 0,
    filters.category ? 1 : 0,
    typeof filters.minPrice === "number" ? 1 : 0,
    typeof filters.maxPrice === "number" ? 1 : 0,
    filters.inStock ? 1 : 0,
    filters.sort !== "newest" ? 1 : 0,
  ].reduce((sum, current) => sum + current, 0);

  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <Badge variant="secondary" className="w-fit">
              Product Catalog
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Explore products built for modern commerce
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Search by keyword, browse categories, and filter by price or stock
              availability to find the right product faster.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <ProductFilters
              categories={categories}
              selectedCategory={filters.category}
              selectedSort={filters.sort}
              minPrice={resolvedSearchParams.minPrice || ""}
              maxPrice={resolvedSearchParams.maxPrice || ""}
              inStock={filters.inStock}
            />
          </aside>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    All products
                  </h2>
                  <p className="text-sm text-slate-600">
                    {totalProducts} product{totalProducts === 1 ? "" : "s"} found
                    {activeFilterCount > 0 ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : ""}
                  </p>
                </div>

                <div className="w-full md:max-w-md">
                  <ProductSearch defaultValue={filters.q} />
                </div>
              </div>

              {(filters.q || filters.category || filters.inStock || typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filters.q ? (
                    <Badge variant="outline">Search: {filters.q}</Badge>
                  ) : null}
                  {filters.category ? (
                    <Badge variant="outline">Category: {filters.category}</Badge>
                  ) : null}
                  {typeof filters.minPrice === "number" ? (
                    <Badge variant="outline">Min: ${filters.minPrice}</Badge>
                  ) : null}
                  {typeof filters.maxPrice === "number" ? (
                    <Badge variant="outline">Max: ${filters.maxPrice}</Badge>
                  ) : null}
                  {filters.inStock ? (
                    <Badge variant="outline">In stock only</Badge>
                  ) : null}

                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href="/products">Clear filters</Link>
                  </Button>
                </div>
              )}
            </div>

            {products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                  No products match your filters
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Try adjusting your search, selecting another category, or
                  clearing the current filters.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/products">View all products</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}