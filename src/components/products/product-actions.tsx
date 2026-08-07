// src/components/products/product-actions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type DeleteTarget = { id: number; slug: string };
type DeleteHandler = (target: DeleteTarget) => Promise<void>;

type ProductActionsProps = {
  productId: number;
  productSlug: string;
  /**
   * Parent owns the mutation (API call + optimistic state + rollback +
   * toast). This component only triggers it and reflects busy state —
   * that's what makes optimistic delete with rollback possible upstream.
   */
  onDelete: DeleteHandler;
};

export const ProductActions = function ProductActions({
  productId,
  productSlug,
  onDelete,
}: ProductActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete({ id: productId, slug: productSlug });
    } finally {
      // Component may unmount immediately on success (row removed by
      // parent) — guarding a set-after-unmount isn't needed here since
      // React 18+ discards it safely, but we still reset for the
      // rollback/error path where the row stays mounted.
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button asChild size="icon-sm" variant="ghost">
        <Link href={`/products/${productSlug}`} aria-label="View product">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>

      <Button asChild size="icon-sm" variant="ghost">
        <Link href={`/products/${productSlug}/edit`} aria-label="Edit product">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>

      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Delete product"
        aria-busy={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin text-red-500" />
        ) : (
          <Trash2 className="h-4 w-4 text-red-500" />
        )}
      </Button>
    </div>
  );
};