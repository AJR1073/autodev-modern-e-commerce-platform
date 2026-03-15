import Link from "next/link";
import { ArrowRight, Grid2X2, ShoppingBag, Sparkles, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type CategoryItem = {
  name: string;
  slug: string;
  description: string;
  itemCount: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const categories: CategoryItem[] = [
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "Fresh picks and recently added products curated for modern shoppers.",
    itemCount: 24,
    href: "/categories/new-arrivals",
    icon: Sparkles,
    accent:
      "from-violet-500/15 via-fuchsia-500/10 to-transparent text-violet-700 ring-violet-200 dark:text-violet-300 dark:ring-violet-800",
  },
  {
    name: "Best Sellers",
    slug: "best-sellers",
    description: "Popular products customers love for quality, value, and everyday use.",
    itemCount: 18,
    href: "/categories/best-sellers",
    icon: ShoppingBag,
    accent:
      "from-emerald-500/15 via-teal-500/10 to-transparent text-emerald-700 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-800",
  },
  {
    name: "Seasonal Deals",
    slug: "seasonal-deals",
    description: "Limited-time savings and timely collections designed around the season.",
    itemCount: 12,
    href: "/categories/seasonal-deals",
    icon: Tag,
    accent:
      "from-amber-500/15 via-orange-500/10 to-transparent text-amber-700 ring-amber-200 dark:text-amber-300 dark:ring-amber-800",
  },
  {
    name: "Shop All Categories",
    slug: "all",
    description: "Browse the full catalog and discover products across every collection.",
    itemCount: 60,
    href: "/products",
    icon: Grid2X2,
    accent:
      "from-sky-500/15 via-blue-500/10 to-transparent text-sky-700 ring-sky-200 dark:text-sky-300 dark:ring-sky-800",
  },
];

export function CategoryGrid() {
  return (
    <section
      aria-labelledby="shop-by-category-heading"
      className="py-16 sm:py-20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-3">
              Shop by category
            </Badge>
            <h2
              id="shop-by-category-heading"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50"
            >
              Explore collections built for faster discovery
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
              Browse curated categories to quickly find trending products,
              customer favorites, and limited-time offers across the catalog.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded-md dark:text-slate-100 dark:hover:text-slate-300 dark:focus-visible:ring-slate-600"
          >
            View all products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.slug}
                href={category.href}
                className="group focus-visible:outline-none"
                aria-label={`Browse ${category.name}`}
              >
                <Card className="h-full overflow-hidden border-slate-200/80 bg-white/90 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-slate-400 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700">
                  <CardContent className="relative flex h-full flex-col p-6">
                    <div
                      className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${category.accent}`}
                      aria-hidden="true"
                    />

                    <div className="relative flex h-full flex-col">
                      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border bg-white/90 shadow-sm ring-1 backdrop-blur dark:bg-slate-900/90">
                        <Icon className={`h-5 w-5 ${category.accent.split(" ")[3]}`} aria-hidden="true" />
                      </div>

                      <div className="mb-4 flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {category.name}
                        </h3>
                        <Badge variant="outline" className="shrink-0">
                          {category.itemCount} items
                        </Badge>
                      </div>

                      <p className="mb-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {category.description}
                      </p>

                      <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition-transform duration-200 group-hover:translate-x-1 dark:text-slate-100">
                        Explore category
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CategoryGrid;