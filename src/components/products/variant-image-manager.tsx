"use client";

import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";

import { ImageOff, Images, Plus, Settings2 } from "lucide-react";

import { ProductImageUpload } from "./product-image-upload";

import type { ProductImageItem, ProductVariant } from "@/types/catalog";
import { getVariantLabel } from "./product-variants.utils";

type Props = {
  variants: ProductVariant[];
  defaultVariantId?: number;
  variantImages: Record<number, ProductImageItem[]>;
  setVariantImages: React.Dispatch<
    React.SetStateAction<Record<number, ProductImageItem[]>>
  >;
};

const THUMBNAIL_LIMIT = 3;

/**
 * Resolves a displayable thumbnail URL for a ProductImageItem.
 * Existing images already carry `url`. Pending local uploads (existing:
 * false) carry a `File` instead and need an object URL, which must be
 * revoked on cleanup to avoid leaking memory.
 */
function useThumbnailUrl(image: ProductImageItem): string {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (image.url) {
      setObjectUrl("");
      return;
    }
    if (!image.file) {
      setObjectUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(image.file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [image.url, image.file]);

  return image.url || objectUrl;
}

type ThumbnailProps = {
  image: ProductImageItem;
  isPrimary: boolean;
  positionLabel: string;
  variantLabel: string;
  stackIndex: number;
};

const Thumbnail = memo(function Thumbnail({
  image,
  isPrimary,
  positionLabel,
  variantLabel,
  stackIndex,
}: ThumbnailProps) {
  const src = useThumbnailUrl(image);

  return (
    <div
      className={
        "relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-neutral-100 shadow-sm ring-1 ring-line/60 " +
        (stackIndex === 0 ? "z-[3]" : stackIndex === 1 ? "z-[2]" : "z-[1]")
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={
            isPrimary
              ? `Primary image for ${variantLabel}`
              : `${positionLabel} for ${variantLabel}`
          }
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
});

type VariantImageRowProps = {
  index: number;
  variant: ProductVariant;
  images: ProductImageItem[];
  isExpanded: boolean;
  onToggleExpand: (variantId: number) => void;
  onImagesChange: (variantId: number, images: ProductImageItem[]) => void;
};

const VariantImageRow = memo(function VariantImageRow({
  index,
  variant,
  images,
  isExpanded,
  onToggleExpand,
  onImagesChange,
}: VariantImageRowProps) {
  const panelId = useId();
  const label = getVariantLabel(variant) || "New Variant";

  const orderedImages = useMemo(
    () => [...images].sort((a, b) => a.sort_order - b.sort_order),
    [images]
  );

  

  const hasId = typeof variant.id === "number";
  const imageCount = images.length;
  const hasImages = imageCount > 0;

  const visibleThumbnails = orderedImages.slice(0, THUMBNAIL_LIMIT);
  const overflowCount = imageCount - visibleThumbnails.length;

  function handleToggle() {
    if (!hasId) return;
    onToggleExpand(variant.id as number);
  }

  return (
    <div className="border-b border-line/70 last:border-b-0">
      <div className="flex flex-col gap-4 px-4 py-4 transition-colors duration-200 hover:bg-neutral-50/60 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-4">
        {/* Variant identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold text-ink"
              title={label}
            >
              {label}
            </p>
            {variant.sku ? (
              <p className="mt-0.5 truncate font-mono text-xs text-ink-faint">
                SKU: {variant.sku}
              </p>
            ) : null}
          </div>
        </div>

        {/* Image status */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:justify-center">
          {hasImages ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                {visibleThumbnails.map((image, thumbIndex) => (
                  <Thumbnail
                    key={image.id ?? `pending-${thumbIndex}`}
                    image={image}
                    isPrimary={thumbIndex === 0}
                    positionLabel={`Image ${thumbIndex + 1}`}
                    variantLabel={label}
                    stackIndex={thumbIndex}
                  />
                ))}
                {overflowCount > 0 ? (
                  <div className="relative z-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-neutral-100 text-[11px] font-semibold text-ink-faint shadow-sm ring-1 ring-line/60">
                    +{overflowCount}
                  </div>
                ) : null}
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-ink-faint">
                {imageCount} {imageCount === 1 ? "image" : "images"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <ImageOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                No specific image
                <span className="hidden sm:inline"> · Uses general gallery</span>
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="sm:shrink-0">
          {hasId ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={handleToggle}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line/80 bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:w-auto"
            >
              {hasImages ? (
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {hasImages ? "Manage Images" : "Add Images"}
            </button>
          ) : (
            <p className="text-right text-xs italic text-ink-faint sm:max-w-[11rem]">
              Save the product first to assign images to this variant.
            </p>
          )}
        </div>
      </div>

      {hasId && isExpanded ? (
        <div
          id={panelId}
          role="region"
          aria-label={`Manage images for ${label}`}
          className="border-t border-line/70 bg-neutral-50/50 px-4 py-5 sm:px-6"
        >
          <ProductImageUpload
            images={images}
            onImagesChange={(nextImages) =>
              onImagesChange(variant.id as number, nextImages)
            }
          />
        </div>
      ) : null}
    </div>
  );
});

export function VariantImageManager({
  variants,
  variantImages,
  setVariantImages,
}: Props) {
  const [expandedVariantId, setExpandedVariantId] = useState<number | null>(
    null
  );

  const totalImageCount = useMemo(
  () =>
    variants.reduce((sum, variant) => {
      if (typeof variant.id !== "number") return sum;

      return sum + (variantImages[variant.id]?.length ?? 0);
    }, 0),
  [variants, variantImages]
);

  const handleToggleExpand = useCallback((variantId: number) => {
    setExpandedVariantId((prev) => (prev === variantId ? null : variantId));
  }, []);

  const handleImagesChange = useCallback(
    (variantId: number, images: ProductImageItem[]) => {
      setVariantImages((prev) => ({
        ...prev,
        [variantId]: images,
      }));
    },
    [setVariantImages]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-line bg-neutral-50/60 px-6 py-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Images className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">Variant Images</h2>
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
              {variants.length} {variants.length === 1 ? "variant" : "variants"}
            </span>
            {totalImageCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                {totalImageCount} assigned
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-faint">
            Assign images to exact product variants. Buyers see these images
            when that variant is selected.
          </p>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-ink-faint">
          Create variants first.
        </div>
      ) : (
        <div>
        
  {variants.map((variant, index) => {
  const variantId =
    typeof variant.id === "number" ? variant.id : null;

  return (
    <VariantImageRow
      key={variant.id ?? `unsaved-${index}`}
      index={index}
      variant={variant}
      images={variantId !== null ? variantImages[variantId] ?? [] : []}
isExpanded={
  variantId !== null && expandedVariantId === variantId
}
      onToggleExpand={handleToggleExpand}
      onImagesChange={handleImagesChange}
    />
  );
})}
        </div>
      )}
    </div>
  );
}