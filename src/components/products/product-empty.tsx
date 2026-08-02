"use client";

import Link from "next/link";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProductEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white py-24 text-center">
      <PackagePlus className="mx-auto h-12 w-12 text-ink-faint" />

      <h2 className="mt-6 text-xl font-semibold text-ink">
        No products found
      </h2>

      <p className="mt-2 text-sm text-ink-faint">
        Start building your BlazeLine catalogue by adding your first product.
      </p>

      <Button asChild className="mt-8">
        <Link href="/products/new">
          Add Product
        </Link>
      </Button>
    </div>
  );
}