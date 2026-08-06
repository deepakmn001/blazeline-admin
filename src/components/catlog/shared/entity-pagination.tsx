"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EntityPaginationProps {
  count: number;

  next: string | null;

  previous: string | null;

  entityName?: string;

  loading?: boolean;

  onPrevious?: () => void;

  onNext?: () => void;
}

export function EntityPagination({
  count,
  next,
  previous,
  entityName = "Items",
  loading = false,
  onPrevious,
  onNext,
}: EntityPaginationProps) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">

      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">

        <div>

          <p className="text-sm text-ink-faint">

            Total{" "}

            <span className="font-semibold text-ink">
              {entityName}
            </span>

          </p>

          <p className="mt-1 text-xl font-bold text-ink">
            {count}
          </p>

        </div>

        <div className="flex items-center gap-3">

          <Button
            variant="secondary"
            disabled={!previous || loading}
            onClick={onPrevious}
          >
            <ChevronLeft className="h-4 w-4" />

            Previous

          </Button>

          <Button
            variant="secondary"
            disabled={!next || loading}
            onClick={onNext}
          >
            Next

            <ChevronRight className="h-4 w-4" />

          </Button>

        </div>

      </div>

    </div>
  );
}