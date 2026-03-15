import Link from 'next/link';
import { ShoppingCart, Search, User, Menu } from 'lucide-react';

import { CartSheet } from '@/components/cart/cart-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const primaryNavigation = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/categories/featured', label: 'Categories' },
  { href: '/checkout', label: 'Checkout' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Go to homepage"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              M
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none">Modern Commerce</p>
              <p className="text-xs text-muted-foreground">Fast, secure shopping</p>
            </div>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
                  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden max-w-md flex-1 lg:block">
          <form action="/products" method="get" role="search" aria-label="Site search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="query"
                placeholder="Search products, categories, or SKU"
                className="pl-9"
                aria-label="Search products"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Search products"
          >
            <Link href="/products">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="My account">
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          <CartSheet>
            <Button variant="ghost" size="icon" aria-label="Open shopping cart">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </CartSheet>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border/60 bg-background md:hidden">
        <nav
          aria-label="Mobile navigation"
          className="container mx-auto flex items-center justify-between gap-2 overflow-x-auto px-4 py-2"
        >
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;