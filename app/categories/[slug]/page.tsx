import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

type CategoryPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: CategoryPageProps) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      slug: true,
    },
  });

  if (!category) {
    return {
      title: "Category Not Found",
      description: "The requested category could not be found.",
    };
  }

  const title = `${category.name} Products`;
  const description =
    category.description ||
    `Browse products in the ${category.name} category.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: {
      products: {
        where: {
          isActive: true,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!category) {
    notFound();
  }

  const activeProductCount = category.products.length;
  const prices = category.products.map((product) => Number(product.price));
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const featuredCount = category.products.filter((product) => product.featured).length;

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="transition-colors hover:text-foreground">
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground">{category.name}</li>
          </ol>
        </nav>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Category
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {category.name}
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {category.description || `Explore our latest ${category.name.toLowerCase()} products.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Badge variant="secondary">{activeProductCount} products</Badge>
              {featuredCount > 0 ? (
                <Badge variant="outline">{featuredCount} featured</Badge>
              ) : null}
              {minPrice !== null && maxPrice !== null ? (
                <Badge variant="outline">
                  {minPrice === maxPrice
                    ? `From ${formatCurrency(minPrice)}`
                    : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/products">View all products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cart">Go to cart</Link>
            </Button>
          </div>
        </div>
      </div>

      {activeProductCount > 0 ? (
        <section aria-labelledby="category-products-heading">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2
                id="category-products-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Products in {category.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {activeProductCount} available product
                {activeProductCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <ProductGrid products={category.products} />
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed bg-muted/30 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            No products available yet
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            We are currently updating this category. Please check back soon or
            browse all products to discover other available items.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/products">Browse all products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}