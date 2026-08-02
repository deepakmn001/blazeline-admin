"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductFilters } from "./product-filters";

export function ProductToolbar() {
  const [search, setSearch] = useState("");

  return (
    <div className="mb-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Products
          </h1>

          <p className="mt-1 text-sm text-ink-faint">
            Manage every product available on BlazeLine.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-10"
            />
          </div>

          {/* Add Product */}
          <Button asChild size="default">
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ProductFilters />
    </div>
  );
}