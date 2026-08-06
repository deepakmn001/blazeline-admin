"use client";

import Link from "next/link";

import { Plus, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SubCategoryToolbar() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">

      <div>
        <h1 className="text-3xl font-bold text-ink">
          Sub Categories
        </h1>

        <p className="mt-1 text-sm text-ink-faint">
          Organize products inside categories.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">

        <div className="relative w-full sm:w-80">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

          <Input
            placeholder="Search sub category..."
            className="pl-10"
          />

        </div>

        <Button asChild>

          <Link href="/subcategories/new">

            <Plus className="mr-2 h-4 w-4" />

            New Sub Category

          </Link>

        </Button>

      </div>

    </div>
  );
}