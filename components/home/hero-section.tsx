import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const trustPoints = [
  {
    icon: ShieldCheck,
    label: "Secure Stripe checkout",
  },
  {
    icon: Truck,
    label: "Reliable order tracking",
  },
  {
    icon: ShoppingBag,
    label: "Curated quality products",
  },
];

const highlights = [
  "Fast, mobile-first shopping experience",
  "Accessible product browsing and checkout",
  "Real-time inventory visibility",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl" />
      </div>

      <div className="container mx-auto grid gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1 text-xs font-semibold">
            Modern commerce, built for speed
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Shop smarter with a faster, more reliable online storefront.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Discover featured products, browse by category, and check out with confidence.
            Our platform is designed for performance, security, and a seamless customer
            experience across every device.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[160px]">
              <Link href="/products">
                Shop products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="min-w-[160px]">
              <Link href="/categories/featured">Browse categories</Link>
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-4">
            {trustPoints.map((point) => {
              const Icon = point.icon;

              return (
                <div
                  key={point.label}
                  className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <Icon className="h-4 w-4 text-slate-900" />
                  <span>{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-slate-900 p-6 text-white">
                <p className="text-sm font-medium text-slate-300">MVP priorities</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold">3s</p>
                    <p className="mt-1 text-sm text-slate-300">Target page load</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">24/7</p>
                    <p className="mt-1 text-sm text-slate-300">Automated ordering</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Customer experience</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">Seamless</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Responsive browsing, persistent cart, and a frictionless checkout flow.
                  </p>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-500">Operations</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">Efficient</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Inventory awareness, order visibility, and streamlined fulfillment support.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-700">Built for growth</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Launch with core commerce essentials today, then expand with richer search,
                  reviews, localization, and advanced merchandising in future phases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}