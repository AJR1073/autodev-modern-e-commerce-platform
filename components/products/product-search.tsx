'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductSearchProps = {
  defaultValue?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  debounceMs?: number;
};

export function ProductSearch({
  defaultValue = '',
  placeholder = 'Search products...',
  onSearch,
  className,
  debounceMs = 300,
}: ProductSearchProps) {
  const [query, setQuery] = useState(defaultValue);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (!onSearch) return;

    const timer = window.setTimeout(() => {
      onSearch(query.trim());
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [query, onSearch, debounceMs]);

  const hasValue = useMemo(() => query.trim().length > 0, [query]);

  return (
    <div className={cn('relative w-full', className)}>
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />

        <Input
          id="product-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Search products"
          className="h-11 w-full rounded-full border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm transition focus:border-slate-300 focus:ring-slate-300"
        />

        {hasValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default ProductSearch;