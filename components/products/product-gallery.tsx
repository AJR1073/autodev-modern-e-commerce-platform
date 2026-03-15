'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type GalleryImage = {
  id?: string;
  url: string;
  alt?: string | null;
};

type ProductGalleryProps = {
  images?: GalleryImage[] | null;
  productName: string;
  className?: string;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80';

export function ProductGallery({
  images,
  productName,
  className,
}: ProductGalleryProps) {
  const normalizedImages = useMemo(() => {
    const validImages =
      images?.filter((image): image is GalleryImage => Boolean(image?.url)) ?? [];

    if (validImages.length > 0) {
      return validImages.map((image, index) => ({
        id: image.id ?? `${image.url}-${index}`,
        url: image.url,
        alt: image.alt?.trim() || `${productName} image ${index + 1}`,
      }));
    }

    return [
      {
        id: 'fallback-image',
        url: FALLBACK_IMAGE,
        alt: `${productName} product image`,
      },
    ];
  }, [images, productName]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeImage =
    normalizedImages[selectedIndex] ?? normalizedImages[0];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative overflow-hidden rounded-2xl border bg-white">
        <div className="relative aspect-square">
          <Image
            key={activeImage.id}
            src={activeImage.url}
            alt={activeImage.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>

      {normalizedImages.length > 1 ? (
        <div
          className="grid grid-cols-4 gap-3 sm:grid-cols-5"
          role="list"
          aria-label={`${productName} image gallery`}
        >
          {normalizedImages.map((image, index) => {
            const isActive = index === selectedIndex;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-white transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                  isActive
                    ? 'border-slate-900 ring-2 ring-slate-900 ring-offset-2'
                    : 'border-slate-200 hover:border-slate-300'
                )}
                aria-label={`View image ${index + 1} of ${normalizedImages.length}`}
                aria-pressed={isActive}
              >
                <div className="relative aspect-square">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default ProductGallery;