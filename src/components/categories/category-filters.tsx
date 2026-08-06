"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategoryFilters() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        {/* Status */}

        <div className="space-y-2">

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Status
          </label>

          <Select>

            <SelectTrigger>

              <SelectValue placeholder="All Status" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="all">
                All Status
              </SelectItem>

              <SelectItem value="active">
                Active
              </SelectItem>

              <SelectItem value="inactive">
                Inactive
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Featured */}

        <div className="space-y-2">

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Featured
          </label>

          <Select>

            <SelectTrigger>

              <SelectValue placeholder="All" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="all">
                All
              </SelectItem>

              <SelectItem value="featured">
                Featured
              </SelectItem>

              <SelectItem value="normal">
                Non Featured
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Group */}

        <div className="space-y-2">

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Group
          </label>

          <Select>

            <SelectTrigger>

              <SelectValue placeholder="All Groups" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="all">
                All Groups
              </SelectItem>

              <SelectItem value="structure">
                Structure
              </SelectItem>

              <SelectItem value="electrical">
                Electrical
              </SelectItem>

              <SelectItem value="lighting">
                Lighting
              </SelectItem>

              <SelectItem value="plumbing">
                Plumbing
              </SelectItem>

              <SelectItem value="bathroom">
                Bathroom
              </SelectItem>

              <SelectItem value="hardware">
                Hardware
              </SelectItem>

              <SelectItem value="finishes">
                Finishes
              </SelectItem>

              <SelectItem value="ceiling">
                Ceiling
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Sort */}

        <div className="space-y-2">

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Sort
          </label>

          <Select>

            <SelectTrigger>

              <SelectValue placeholder="Newest" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="newest">
                Newest
              </SelectItem>

              <SelectItem value="oldest">
                Oldest
              </SelectItem>

              <SelectItem value="name">
                Name (A-Z)
              </SelectItem>

              <SelectItem value="products">
                Product Count
              </SelectItem>

              <SelectItem value="subcategory">
                Subcategory Count
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Reset */}

        <div className="flex items-end">

          <Button
            variant="secondary"
            className="w-full"
          >
            <RotateCcw className="h-4 w-4" />

            Reset Filters

          </Button>

        </div>

      </div>

    </div>
  );
}