"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Rocket,
  Trash2,
  ImageOff,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ParsedProduct } from "@/services/catalog-import.service";

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span
        className={cn(
          "max-w-[60%] text-right text-sm text-ink",
          mono && "font-mono text-xs",
        )}
      >
        {value ?? <span className="text-ink-faint">—</span>}
      </span>
    </div>
  );
}

export interface ReviewDrawerProps {
  product: ParsedProduct | null;
  open: boolean;
  onClose: () => void;
  onEdit: (product: ParsedProduct) => void;
  onPublish: (product: ParsedProduct) => void;
  onDelete: (product: ParsedProduct) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  isPublishing?: boolean;
  isDeleting?: boolean;
}

export function ReviewDrawer({
  product,
  open,
  onClose,
  onEdit,
  onPublish,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  isPublishing = false,
  isDeleting = false,
}: ReviewDrawerProps) {
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    setImageErrored(false);
  }, [product?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious?.();
      if (event.key === "ArrowRight" && hasNext) onNext?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!open || !product) return null;

  const showImage = Boolean(product.image) && !imageErrored;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${product.product_name}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[620px] flex-col overflow-hidden border-l border-line bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous product"
              disabled={!hasPrevious}
              onClick={onPrevious}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Next product"
              disabled={!hasNext}
              onClick={onNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <h2 className="ml-1 text-sm font-semibold text-ink">
              Product Review
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Close drawer"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex justify-center">
            {showImage ? (
              <img
                src={product.image ?? undefined}
                alt={product.product_name}
                onError={() => setImageErrored(true)}
                className="h-64 w-64 rounded-xl border border-line object-cover"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-dashed border-line bg-slate-50 text-slate-300">
                <ImageOff className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>

          <h3 className="text-center text-base font-semibold text-ink">
            {product.product_name}
          </h3>
          <p className="mb-4 text-center font-mono text-xs text-ink-faint">
            {product.sku}
          </p>

          <Separator className="my-3" />
          <DetailRow label="Category" value={product.category} />
          <DetailRow label="Sub Category" value={product.subcategory} />
          <DetailRow label="Variant" value={product.variant} />
          <DetailRow label="Finish" value={product.finish} />

          <Separator className="my-3" />
          <DetailRow label="GD Price" value={product.gd_price != null ? `$${product.gd_price}` : null} />
          <DetailRow label="RGD Price" value={product.rgd_price != null ? `$${product.rgd_price}` : null} />

          <Separator className="my-3" />
          <DetailRow label="Status" value={product.status} />
          <DetailRow label="Imported" value={product.is_imported ? "Yes" : "No"} />
          <DetailRow
            label="Created At"
            value={product.created_at ? new Date(product.created_at).toLocaleString() : null}
          />

          {product.error_message && (
            <>
              <Separator className="my-3" />
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Error Message
                </p>
                <p className="mt-1 text-sm text-red-700">{product.error_message}</p>
              </div>
            </>
          )}

          <Separator className="my-3" />
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            OCR Raw Text
          </p>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-slate-50 p-3 font-mono text-xs text-ink">
            {product.raw_text || "—"}
          </pre>
        </div>

        <div className="border-t border-line px-5 py-4">
          {!product.subcategory?.trim() && (
            <p className="mb-2 text-xs text-red-600">
              Please select a subcategory before publishing.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => onEdit(product)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>

            <Button
              type="button"
              className="flex-1 gap-1.5"
              disabled={
                isPublishing ||
                product.is_imported ||
                !product.subcategory?.trim()
              }
              onClick={() => onPublish(product)}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden="true" />
              )}
              Publish
            </Button>

            <Button
              type="button"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={isDeleting}
              onClick={() => onDelete(product)}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}