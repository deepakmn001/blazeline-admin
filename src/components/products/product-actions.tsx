"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/services/product.service";

type ProductActionsProps = {
  productId: number;
  productSlug: string;
};

export function ProductActions({
  productId,
  productSlug,
}: ProductActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await deleteProduct(productSlug);

      toast.success("Product deleted successfully.");

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product.");
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        asChild
        size="icon-sm"
        variant="ghost"
      >
        <Link href={`/products/${productSlug}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>

      <Button
        asChild
        size="icon-sm"
        variant="ghost"
      >
        <Link href={`/products/${productSlug}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>

      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}