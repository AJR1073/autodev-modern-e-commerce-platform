import Image from "next/image";
import Link from "next/link";

import { AddToCartForm } from "@/components/products/add-to-cart-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    images?: string[] | null;
    category?: {
      name: string;
      slug: string;
    } | null;
    inventory?: {
      quantity: number;
    } | null;
    stock?: number | null;
    isFeatured?: boolean | null;
    description?: string | null;
    sku?: string | null;
  };
  className?: string;
  priority?: boolean;
};

function getInventoryCount(product: ProductCardProps["product"]) {
  if (typeof product.inventory?.quantity === "number") {
    return product.inventory.quantity;
  }

  if (typeof product.stock === "number") {
    return product.stock;
  }

  return null;
}

export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const imageSrc = product.images?.[0] || "/placeholder-product.jpg";
  const inventoryCount = getInventoryCount(product);
  const isOutOfStock = inventoryCount !== null && inventoryCount <= 0;
  const isLowStock = inventoryCount !== null && inventoryCount > 0 && inventoryCount <= 5;
  const hasDiscount =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        className
      )}
    >
      <CardHeader className="p-0">
        <Link
          href={`/products/${product.slug}`}
          className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View details for ${product.name}`}
        >
          <div className="relative aspect-square bg-muted">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />

            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              {product.isFeatured ? <Badge variant="secondary">Featured</Badge> : null}
              {hasDiscount ? <Badge variant="destructive">-{discountPercentage}%</Badge> : null}
              {isOutOfStock ? <Badge variant="outline">Out of stock</Badge> : null}
              {!isOutOfStock && isLowStock ? <Badge variant="outline">Low stock</Badge> : null}
            </div>
          </div>
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          {product.category ? (
            <Link
              href={`/categories/${product.category.slug}`}
              className="inline-flex text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              {product.category.name}
            </Link>
          ) : null}

          <Link
            href={`/products/${product.slug}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </Link>

          {product.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(product.price)}
              </span>
              {hasDiscount ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.compareAtPrice!)}
                </span>
              ) : null}
            </div>

            {inventoryCount !== null ? (
              <p
                className={cn(
                  "text-xs",
                  isOutOfStock
                    ? "text-destructive"
                    : isLowStock
                      ? "text-amber-600"
                      : "text-muted-foreground"
                )}
              >
                {isOutOfStock
                  ? "Currently unavailable"
                  : isLowStock
                    ? `Only ${inventoryCount} left`
                    : "In stock"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Available to order</p>
            )}
          </div>

          {product.sku ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">SKU: {product.sku}</span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <AddToCartForm
          productId={product.id}
          disabled={isOutOfStock}
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}