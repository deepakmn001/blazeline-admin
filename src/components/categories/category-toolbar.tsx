"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { CategoryFilters } from "./category-filters";

export function CategoryToolbar() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Categories
          </h1>

          <p className="mt-1 text-sm text-ink-faint">
            Manage every catalogue category available inside BlazeLine.
          </p>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          {/* Search */}

          <div className="relative w-full sm:w-80">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="pl-10"
            />

          </div>

          {/* Refresh */}

          <Button
            variant="secondary"
            size="default"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Export */}

          <Button
            variant="secondary"
            size="default"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Import */}

          <Button
            variant="secondary"
            size="default"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>

          {/* Add */}

          <Button asChild>

            <Link href="/categories/new">

              <Plus className="h-4 w-4" />

              Add Category

            </Link>

          </Button>

        </div>

      </div>

      {/* Filters */}

      <CategoryFilters />

    </div>
  );
}