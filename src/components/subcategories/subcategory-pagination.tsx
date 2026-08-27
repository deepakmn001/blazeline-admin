"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SubCategoryPaginationProps {
  count: number;
  next: string | null;
  previous: string | null;
  onNext: () => void;
  onPrevious: () => void;
  loading?: boolean;
}

export function SubCategoryPagination({
  count,
  next,
  previous,
  onNext,
  onPrevious,
  loading = false,
}: SubCategoryPaginationProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-faint">
        Total Sub Categories{" "}
        <span className="font-semibold text-ink">
          {count}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!previous || loading}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={!next || loading}
          onClick={onNext}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}