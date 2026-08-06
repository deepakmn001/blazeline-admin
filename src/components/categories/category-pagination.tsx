"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CategoryPaginationProps {
  count: number;
  next: string | null;
  previous: string | null;
}

export function CategoryPagination({
  count,
  next,
  previous,
}: CategoryPaginationProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

      <p className="text-sm text-ink-faint">
        Total Categories{" "}
        <span className="font-semibold text-ink">
          {count}
        </span>
      </p>

      <div className="flex items-center gap-3">

        <Button
          variant="secondary"
          disabled={!previous}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <Button
          variant="secondary"
          disabled={!next}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>

      </div>

    </div>
  );
}