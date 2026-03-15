'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FilterCategory = {
  id: string;
  name: string;
  slug: string;
};

type ProductFiltersProps = {
  categories?: FilterCategory[];
  minPrice?: number;
  maxPrice?: number;
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
] as const;

export function ProductFilters({
  categories = [],
  minPrice = 0,
  maxPrice = 10000,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get('category') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const selectedMinPrice = searchParams.get('minPrice') || '';
  const selectedMaxPrice = searchParams.get('maxPrice') || '';

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      selectedCategory ||
        selectedMinPrice ||
        selectedMaxPrice ||
        (selectedSort && selectedSort !== 'newest')
    );
  }, [selectedCategory, selectedMaxPrice, selectedMinPrice, selectedSort]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleCategoryChange = (value: string) => {
    updateParams({
      category: value || null,
      page: null,
    });
  };

  const handleSortChange = (value: string) => {
    updateParams({
      sort: value === 'newest' ? null : value,
      page: null,
    });
  };

  const handlePriceSubmit = (formData: FormData) => {
    const nextMin = String(formData.get('minPrice') || '').trim();
    const nextMax = String(formData.get('maxPrice') || '').trim();

    updateParams({
      minPrice: nextMin || null,
      maxPrice: nextMax || null,
      page: null,
    });
  };

  const clearFilters = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <p className="mt-1 text-xs text-slate-500">Refine products by category, price, and sort order.</p>
        </div>

        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="space-y-6">
        <section aria-labelledby="category-filter-heading">
          <h3 id="category-filter-heading" className="mb-3 text-sm font-medium text-slate-900">
            Category
          </h3>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300">
              <input
                type="radio"
                name="category"
                value=""
                checked={selectedCategory === ''}
                onChange={() => handleCategoryChange('')}
                className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              <span className="text-slate-700">All categories</span>
            </label>

            {categories.map((category) => (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300"
              >
                <input
                  type="radio"
                  name="category"
                  value={category.slug}
                  checked={selectedCategory === category.slug}
                  onChange={() => handleCategoryChange(category.slug)}
                  className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span className="text-slate-700">{category.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="sort-filter-heading">
          <h3 id="sort-filter-heading" className="mb-3 text-sm font-medium text-slate-900">
            Sort by
          </h3>

          <select
            value={selectedSort}
            onChange={(event) => handleSortChange(event.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <section aria-labelledby="price-filter-heading">
          <h3 id="price-filter-heading" className="mb-3 text-sm font-medium text-slate-900">
            Price range
          </h3>

          <form action={handlePriceSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="minPrice" className="text-xs font-medium text-slate-600">
                  Min
                </label>
                <Input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  step="0.01"
                  defaultValue={selectedMinPrice}
                  placeholder={String(minPrice)}
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="maxPrice" className="text-xs font-medium text-slate-600">
                  Max
                </label>
                <Input
                  id="maxPrice"
                  name="maxPrice"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  step="0.01"
                  defaultValue={selectedMaxPrice}
                  placeholder={String(maxPrice)}
                  inputMode="decimal"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Apply price
            </Button>
          </form>
        </section>
      </div>
    </aside>
  );
}

export default ProductFilters;