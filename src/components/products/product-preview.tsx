"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useImagePreviewUrls } from "@/hooks/use-image-preview-urls";
import type { ProductImageItem } from "@/types/catalog";

type ProductPreviewProps = {
  images: ProductImageItem[];
  productName: string;
  category: string;
  price: string;
  status: string;
  featured: boolean;
  heavyDiscount: boolean;
};

export function ProductPreview({
  images,
  productName,
  category,
  price,
  status,
  featured,
  heavyDiscount,
}: ProductPreviewProps) {
  // Same resolution logic as ProductImageUpload — existing Cloudinary
  // URLs and pending File uploads render identically, no branching here.
  const previewUrls = useImagePreviewUrls(images);
  const coverUrl = previewUrls[0];
  const hasImage = Boolean(coverUrl);

  const statusVariant =
    status === "published"
      ? "success"
      : status === "draft"
      ? "warning"
      : "outline";

  return (
    <div
      role="group"
      aria-label={`Live preview of ${productName || "product"}`}
      className="group overflow-hidden rounded-3xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.18)]"
    >
      {/* PANEL HEADER */}
      <div className="flex items-center justify-between border-b border-line/70 bg-neutral-50/60 px-6 py-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Live Preview
          </p>
          <p className="mt-0.5 text-xs text-ink-faint/80">
            This is how your product will appear
          </p>
        </div>
        <span
          aria-hidden="true"
          className="hidden h-2 w-2 rounded-full bg-brand-500 sm:block"
        />
      </div>

      {/* IMAGE */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {hasImage ? (
          <>
            <Image
              src={coverUrl}
              alt={productName || "Product"}
              width={800}
              height={600}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            {/* Elegant scrim for legibility + depth */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10"
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,theme(colors.neutral.50),theme(colors.neutral.100))]">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/70"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-neutral-400"
              >
                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15.5l-5.2-5.2a2 2 0 0 0-2.8 0L3 20.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-400">
              No image uploaded
            </p>
          </div>
        )}

        {/* Overlay badges: featured / discount */}
        {(featured || heavyDiscount) && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {featured && (
              <span className="drop-shadow-sm">
                <Badge variant="brand">Featured</Badge>
              </span>
            )}
            {heavyDiscount && (
              <span className="drop-shadow-sm">
                <Badge variant="danger">Heavy Discount</Badge>
              </span>
            )}
          </div>
        )}

        {/* Overlay badge: status */}
        <div className="absolute right-3 top-3">
          <span
            className="drop-shadow-sm"
            role="status"
            aria-label={`Status: ${status}`}
          >
            <Badge variant={statusVariant}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-center gap-1.5 text-ink-faint">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M3 12l9 4 9-4" />
            <path d="M3 17l9 4 9-4" />
          </svg>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em]">
            {category || "Uncategorized"}
          </span>
        </div>

        <h3 className="mt-2.5 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[1.75rem]">
          {productName || "Product Name"}
        </h3>

        <div className="mt-6 flex items-baseline gap-1.5 border-t border-line/70 pt-5">
          <span className="text-lg font-medium text-ink-faint">₹</span>
          <span className="text-4xl font-bold tracking-tight text-brand-600 tabular-nums">
            {price || "0"}
          </span>
        </div>
      </div>
    </div>
  );
}