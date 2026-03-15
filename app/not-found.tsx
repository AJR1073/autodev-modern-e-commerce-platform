import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section
        aria-labelledby="not-found-title"
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Error 404
        </p>

        <h1
          id="not-found-title"
          className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Page not found
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          The page you&apos;re looking for may have been moved, deleted, or never
          existed. You can head back to the storefront, browse products, or view
          your cart.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">Go to home</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/products">Browse products</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/cart">View cart</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}