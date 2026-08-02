"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import {
  ImagePlus,
  Upload,
  Trash2,
  Star,
  ImageIcon,
  GripVertical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useImagePreviewUrls } from "@/hooks/use-image-preview-urls";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import {
  appendFiles,
  getImageKey,
  removeImageAt,
  reorderImages,
} from "./product-images.utils";
import type { ProductImageItem } from "@/types/catalog";

type ProductImageUploadProps = {
  images: ProductImageItem[];
  onImagesChange: (images: ProductImageItem[]) => void;
};

const RECOMMENDED_IMAGE_COUNT = 8;

export function ProductImageUpload({
  images,
  onImagesChange,
}: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Single shared preview source — resolves backend URLs and pending
  // File uploads through the exact same code path used by ProductPreview.
  const previewUrls = useImagePreviewUrls(images);

  // Pointer-based reorder — identical code path for mouse, touch, and
  // stylus. Reordering during drag is driven purely by array index,
  // so `reindexImages` inside `reorderImages` keeps sort_order/featured
  // correct automatically.
  const {
    dragState,
    registerItemRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useDragReorder(
    images,
    getImageKey,
    (fromIndex, toIndex) => onImagesChange(reorderImages(images, fromIndex, toIndex))
  );

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onImagesChange(appendFiles(images, Array.from(files)));
  }

  function removeImage(index: number) {
    onImagesChange(removeImageAt(images, index));
  }

  function handleDropzoneClick() {
    inputRef.current?.click();
  }

  function handleDropzoneKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const hasImages = images.length > 0;

  // Ghost preview index — resolved fresh each render so it always
  // shows the item currently at the dragged key's position, even as
  // reordering happens live during the drag.
  const draggedIndex = dragState
    ? images.findIndex((img) => getImageKey(img) === dragState.key)
    : -1;

  return (
    <div className="rounded-2xl border border-line/70 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(17,17,17,0.06)]">
      {/* Header */}

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
            <ImageIcon
              className="h-[18px] w-[18px] text-brand-500"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
              Product Images
            </h2>
            <p className="mt-0.5 text-sm text-ink-faint">
              High-quality images improve buyer confidence.
            </p>
          </div>
        </div>

        {hasImages && (
          <span
            className="shrink-0 rounded-full border border-line/80 bg-neutral-50 px-3 py-1 text-xs font-medium tabular-nums text-ink-faint"
            aria-hidden="true"
          >
            {images.length}{" "}
            {images.length === 1 ? "image" : "images"} uploaded
          </span>
        )}
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        {/* Upload Area */}

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload product images. Click or drag and drop files here."
          onClick={handleDropzoneClick}
          onKeyDown={handleDropzoneKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer touch-manipulation rounded-2xl border-2 border-dashed transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 ${
            isDragging
              ? "border-brand-500 bg-brand-50/50 scale-[1.005]"
              : "border-line bg-neutral-50 hover:border-brand-500/60 hover:bg-brand-50/30 active:bg-brand-50/40"
          }`}
        >
          <div className="flex flex-col items-center px-6 py-10 sm:px-8 sm:py-14">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-200 sm:h-16 sm:w-16 ${
                isDragging ? "bg-brand-500/15" : "bg-brand-50"
              }`}
            >
              <ImagePlus
                className="h-7 w-7 text-brand-600 sm:h-8 sm:w-8"
                aria-hidden="true"
              />
            </div>

            <h3 className="mt-4 text-center text-[15px] font-semibold text-ink sm:mt-5 sm:text-lg">
              {isDragging ? "Drop images to upload" : "Upload product images"}
            </h3>

            <p className="mt-2 max-w-xs text-center text-xs leading-relaxed text-ink-faint sm:text-sm">
              Tap to browse, or drag and drop files here.
              The first image becomes the cover image.
            </p>

            <Button
              type="button"
              variant="secondary"
              className="mt-5 sm:mt-6"
              tabIndex={-1}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Browse Files
            </Button>

            <p className="mt-4 text-xs text-ink-faint">
              PNG, JPG or WEBP &middot; up to {RECOMMENDED_IMAGE_COUNT} images
              recommended
            </p>

            <input
              ref={inputRef}
              hidden
              multiple
              type="file"
              accept="image/*"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Live region for screen readers */}
        <p className="sr-only" role="status" aria-live="polite">
          {hasImages
            ? `${images.length} ${
                images.length === 1 ? "image" : "images"
              } uploaded. Image 1 is the cover image.`
            : "No images uploaded yet."}
        </p>

        {/* Image Preview */}

        {hasImages && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Uploaded Images
              </h3>

              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                <Star
                  className="h-3.5 w-3.5 fill-brand-500 text-brand-500"
                  aria-hidden="true"
                />
                Image 1 is the cover · drag the handle to reorder
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {images.map((image, index) => {
                const key = getImageKey(image);
                const isCover = index === 0;
                const isBeingDragged = dragState?.key === key;

                return (
                  <div
                    key={key}
                    ref={(el) => registerItemRef(key, el)}
                    data-drag-key={key}
                    className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
                      isCover
                        ? "border-brand-500 ring-1 ring-brand-500/40"
                        : "border-line/80"
                    } ${isBeingDragged ? "opacity-30" : "opacity-100"}`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                      <Image
                        src={previewUrls[index]}
                        alt={`Product image ${index + 1}${
                          isCover ? " (cover image)" : ""
                        }`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                        unoptimized
                      />

                      {/* Gradient overlay for legibility on hover/focus */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />
                    </div>

                    {/* Image number */}
                    <div className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/55 px-1.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    {/* Delete — always visible on touch, hover-revealed on desktop */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      aria-label={`Remove image ${index + 1}${
                        isCover ? " (cover image)" : ""
                      }`}
                      className="absolute right-2 top-2 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full bg-white text-red-500 opacity-100 shadow-md outline-none transition-all duration-200 hover:bg-red-50 active:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500/40 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Featured */}
                    {isCover && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-brand-500 px-2 py-1 text-[10px] font-semibold text-white shadow">
                        <Star
                          className="h-3 w-3 fill-white"
                          aria-hidden="true"
                        />
                        Cover
                      </div>
                    )}

                    {/* Drag handle — always visible (no hover dependency,
                        since hover doesn't exist on touch). Pointer capture
                        is set here, so move/up events keep arriving to this
                        element even once the finger leaves its bounds. */}
                    <button
                      type="button"
                      aria-label={`Reorder image ${index + 1}. Press and drag.`}
                      onPointerDown={(e) => handlePointerDown(e, key)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      className="absolute bottom-2 right-2 flex h-8 w-8 touch-none items-center justify-center rounded-full bg-black/55 text-white shadow-md backdrop-blur-sm transition-colors duration-200 hover:bg-black/70 active:bg-black/80"
                    >
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating ghost — follows the pointer while a drag is active.
          `position: fixed` so it renders above the entire page,
          independent of scroll position, without needing a portal. */}
      {dragState && draggedIndex !== -1 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 overflow-hidden rounded-xl border-2 border-brand-500 bg-white shadow-2xl"
          style={{
            left: dragState.x - dragState.pointerOffsetX,
            top: dragState.y - dragState.pointerOffsetY,
            width: dragState.width,
            height: dragState.height,
            transform: "scale(1.04) rotate(-1deg)",
          }}
        >
          <div className="relative h-full w-full">
            <Image
              src={previewUrls[draggedIndex]}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}