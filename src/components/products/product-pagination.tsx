"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type ProductPaginationProps = {
  count: number;
  next: string | null;
  previous: string | null;
};

export function ProductPagination({
  count,
  next,
  previous,
}: ProductPaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-6 py-4">
      <p className="text-sm text-ink-faint">
        Showing <span className="font-semibold">1–10</span> of{" "}
        <span className="font-semibold">{count}</span> products
      </p>

      <div className="flex items-center gap-2">
        <button
          disabled={!previous}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          1
        </button>

        <button
          disabled={!next}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}