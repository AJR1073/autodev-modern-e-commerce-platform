import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main
      className="min-h-[calc(100vh-8rem)] bg-slate-50"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-5 w-full max-w-3xl" />
            <Skeleton className="h-5 w-4/5 max-w-2xl" />
            <div className="flex flex-wrap gap-3 pt-2">
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-64 w-full rounded-2xl sm:h-80" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="mb-4 h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-48 rounded-xl" />
              <Skeleton className="h-11 w-36 rounded-xl" />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>

      <span className="sr-only">Loading store content</span>
    </main>
  );
}