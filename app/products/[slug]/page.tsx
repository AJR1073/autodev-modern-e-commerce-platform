import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/products/add-to-cart-form";
import { ProductGallery } from "@/components/products/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

type ProductPageProps = {
  params: {
    slug: string;
  };
};

async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      inventory: true,
    },
  });
}

async function getRelatedProducts(categoryId?: string, currentProductId?: string) {
  if (!categoryId || !currentProductId) return [];

  return prisma.product.findMany({
    where: {
      categoryId,
      id: {
        not: currentProductId,
      },
      isActive: true,
    },
    include: {
      inventory: true,
      category: true,
    },
    take: 4,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    };
  }

  const title = `${product.name} | Modern E-Commerce`;
  const description =
    product.description?.slice(0, 160) ||
    `Shop ${product.name} online with secure checkout and fast fulfillment.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product || !product.isActive) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.categoryId, product.id);

  const price =
    typeof product.price === "number"
      ? product.price
      : Number(product.price || 0);

  const compareAtPrice =
    product.compareAtPrice == null
      ? null
      : typeof product.compareAtPrice === "number"
        ? product.compareAtPrice
        : Number(product.compareAtPrice);

  const inventoryQuantity = product.inventory?.quantity ?? 0;
  const inStock = inventoryQuantity > 0;
  const lowStock = inStock && inventoryQuantity <= 5;
  const savings =
    compareAtPrice && compareAtPrice > price ? compareAtPrice - price : 0;

  const galleryImages = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter(Boolean) as string[];

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-600">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="hover:text-slate-900">
                Products
              </Link>
            </li>
            {product.category && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="hover:text-slate-900"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-900">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <ProductGallery
              images={galleryImages.length ? galleryImages : ["/placeholder-product.jpg"]}
              productName={product.name}
            />
          </div>

          <div className="flex flex-col">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {product.category?.name ? (
                <Badge variant="secondary">{product.category.name}</Badge>
              ) : null}
              {inStock ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  In Stock
                </Badge>
              ) : (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
              {lowStock ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  Low Stock
                </Badge>
              ) : null}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {product.name}
            </h1>

            {product.sku ? (
              <p className="mt-2 text-sm text-slate-500">SKU: {product.sku}</p>
            ) : null}

            <div className="mt-6 flex items-end gap-3">
              <span className="text-3xl font-semibold text-slate-900">
                {formatCurrency(price)}
              </span>
              {compareAtPrice && compareAtPrice > price ? (
                <span className="text-lg text-slate-400 line-through">
                  {formatCurrency(compareAtPrice)}
                </span>
              ) : null}
            </div>

            {savings > 0 ? (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                You save {formatCurrency(savings)}
              </p>
            ) : null}

            <div className="mt-6">
              <p className="text-base leading-7 text-slate-700">
                {product.description || "No product description is currently available."}
              </p>
            </div>

            <Separator className="my-8" />

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">Availability</h2>
                    <p className="text-sm text-slate-600">
                      {inStock
                        ? lowStock
                          ? `Only ${inventoryQuantity} left in stock`
                          : "Ready to ship"
                        : "Currently unavailable"}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    {product.inventory?.reservedQuantity
                      ? `${product.inventory.reservedQuantity} reserved`
                      : null}
                  </div>
                </div>
              </div>

              <AddToCartForm
                productId={product.id}
                productName={product.name}
                price={price}
                image={product.image || galleryImages[0] || ""}
                slug={product.slug}
                inventoryQuantity={inventoryQuantity}
                disabled={!inStock}
              />

              {!inStock ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  This product is currently out of stock. Browse similar items below or
                  continue shopping.
                </div>
              ) : null}
            </div>

            <Separator className="my-8" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">Secure Checkout</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Protected payment flow with Stripe integration.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">Fast Fulfillment</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Orders are processed efficiently for timely delivery.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">Support Ready</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Need help? Our team is available to assist with your order.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Related products
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Explore more items you may be interested in.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">View all products</Link>
            </Button>
          </div>

          {relatedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-600">
                No related products available right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((item) => {
                const itemPrice =
                  typeof item.price === "number"
                    ? item.price
                    : Number(item.price || 0);

                const itemCompareAtPrice =
                  item.compareAtPrice == null
                    ? null
                    : typeof item.compareAtPrice === "number"
                      ? item.compareAtPrice
                      : Number(item.compareAtPrice);

                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <Link href={`/products/${item.slug}`} className="block">
                      <div className="aspect-square overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image || "/placeholder-product.jpg"}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        {item.category?.name ? (
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {item.category.name}
                          </p>
                        ) : null}
                        <h3 className="mt-1 line-clamp-2 font-semibold text-slate-900">
                          {item.name}
                        </h3>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(itemPrice)}
                          </span>
                          {itemCompareAtPrice && itemCompareAtPrice > itemPrice ? (
                            <span className="text-sm text-slate-400 line-through">
                              {formatCurrency(itemCompareAtPrice)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}