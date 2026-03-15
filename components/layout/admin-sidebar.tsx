"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Boxes, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview and store performance",
    exact: true,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    description: "Manage catalog and pricing",
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    description: "Track fulfillment and statuses",
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Boxes,
    description: "Monitor stock levels",
  },
] as const;

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          aria-label="Go to admin dashboard"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
            AE
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Admin Console</p>
            <p className="truncate text-xs text-slate-500">Store operations</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Management
        </p>

        <nav className="space-y-1" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      active
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-slate-200 bg-white text-slate-600 group-hover:border-slate-300 group-hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                    <span
                      className={cn(
                        "block truncate text-xs",
                        active ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                </div>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    active ? "text-slate-300" : "text-slate-400 group-hover:translate-x-0.5"
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Operations status</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Review orders, products, and inventory from one centralized workspace.
          </p>
        </div>
      </div>
    </aside>
  );
}