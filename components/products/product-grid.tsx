import { ProductCard } from "@/components/products/product-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

type ProductGridProps = {
  products: Product[];
  title?: string;
  description?: string;
  className?: string;
  columns?: 2 | 3 | 4;
  emptyTitle?: string;
  emptyDescription?: string;
};

const gridColumnClasses: Record<NonNullable<ProductGridProps["columns"]>, string> = {
  2: "grid-cols-1 gap-6 sm:grid-cols-2",
  3: "grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

export function ProductGrid({
  products,
  title,
  description,
  className,
  columns = 4,
  emptyTitle = "No products found",
  emptyDescription = "Try adjusting your filters or search terms to find what you're looking for.",
}: ProductGridProps) {
  const hasProducts = products.length > 0;

  return (
    <section
      className={cn("space-y-6", className)}
      aria-labelledby={title ? "product-grid-title" : undefined}
    >
      {(title || description) && (
        <div className="space-y-2">
          {title ? (
            <h2
              id="product-grid-title"
              className="text-2xl font-semibold tracking-tight text-slate-900"
            >
              {title}
            </h2>
          ) : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
      )}

      {!hasProducts ? (
        <Alert className="border-dashed bg-white">
          <AlertTitle>{emptyTitle}</AlertTitle>
          <AlertDescription>{emptyDescription}</AlertDescription>
        </Alert>
      ) : (
        <div
          className={cn("grid", gridColumnClasses[columns])}
          role="list"
          aria-label="Products"
        >
          {products.map((product) => (
            <div key={product.id} role="listitem">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}