import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Manage products, orders, and inventory for the store.',
};

const adminLinks = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/inventory', label: 'Inventory' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/account');
  }

  const userRole = String((user as { role?: string | null }).role || 'CUSTOMER').toUpperCase();

  if (userRole !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-6 py-5">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">
                  S
                </span>
                Store Admin
              </Link>
              <p className="mt-2 text-sm text-slate-600">Manage catalog, orders, and inventory.</p>
            </div>

            <div className="flex-1">
              <div className="hidden lg:block">
                <AdminSidebar />
              </div>

              <nav className="grid gap-1 px-4 py-4 lg:hidden" aria-label="Admin navigation">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <p className="text-sm font-medium text-slate-900">
                {String((user as { name?: string | null }).name || 'Admin User')}
              </p>
              <p className="text-xs text-slate-500">
                {String((user as { email?: string | null }).email || 'admin@example.com')}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Administration</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Store operations dashboard</h1>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}