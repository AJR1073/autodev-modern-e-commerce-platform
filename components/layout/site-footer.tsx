import Link from "next/link";

const footerNavigation = {
  shop: [
    { name: "All Products", href: "/products" },
    { name: "Categories", href: "/products" },
    { name: "Cart", href: "/cart" },
    { name: "Checkout", href: "/checkout" },
  ],
  company: [
    { name: "Home", href: "/" },
    { name: "My Account", href: "/account" },
    { name: "Admin Dashboard", href: "/admin" },
  ],
  support: [
    { name: "Order Tracking", href: "/account" },
    { name: "Shipping Updates", href: "/account" },
    { name: "Contact Support", href: "mailto:support@example.com" },
  ],
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
              aria-label="Go to homepage"
            >
              Modern Commerce
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              A modern e-commerce experience built for secure checkout, fast
              browsing, reliable order management, and a mobile-first customer
              journey.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                Secure Checkout
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                Fast Shipping Updates
              </span>
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                Accessible Design
              </span>
            </div>
          </div>

          <FooterNavSection title="Shop" links={footerNavigation.shop} />
          <FooterNavSection title="Company" links={footerNavigation.company} />
          <FooterNavSection title="Support" links={footerNavigation.support} />
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Modern Commerce. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/"
              className="transition-colors hover:text-foreground"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterNavLink = {
  name: string;
  href: string;
};

function FooterNavSection({
  title,
  links,
}: {
  title: string;
  links: FooterNavLink[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => {
          const isExternal = link.href.startsWith("mailto:");

          if (isExternal) {
            return (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.name}
                </a>
              </li>
            );
          }

          return (
            <li key={link.name}>
              <Link
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}