"use client";

import Link from "next/link";

import { FolderTree, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SubCategoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-20 text-center">

      <FolderTree className="h-14 w-14 text-neutral-400" />

      <h2 className="mt-6 text-2xl font-semibold">
        No Sub Categories Found
      </h2>

      <p className="mt-2 max-w-md text-sm text-ink-faint">
        Create your first sub category to organize products.
      </p>

      <Button
        asChild
        className="mt-8"
      >
        <Link href="/subcategories/new">

          <Plus className="mr-2 h-4 w-4" />

          Create Sub Category

        </Link>
      </Button>

    </div>
  );
}