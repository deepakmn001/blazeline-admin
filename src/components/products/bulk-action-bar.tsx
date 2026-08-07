"use client";

import { memo } from "react";
import { Move, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onMove: () => void;
  onClear: () => void;
}

/**
 * Fully controlled by ProductsClient — no state of its own. Renders
 * nothing when selectedCount is 0, so the parent doesn't need a
 * conditional wrapper around it. Memoized so it only re-renders when
 * selectedCount changes or one of the (stable, empty-deps) callback
 * props changes.
 */
export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  onDelete,
  onMove,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      aria-orientation="horizontal"
      className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-semibold text-ink" aria-live="polite">
        {selectedCount} product{selectedCount === 1 ? "" : "s"} selected
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMove}
          className="h-9 gap-1.5 rounded-xl border-line bg-white text-sm font-medium text-ink shadow-sm hover:bg-neutral-50"
        >
          <Move className="h-4 w-4" aria-hidden="true" />
          Move
        </Button>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="h-9 gap-1.5 rounded-xl text-sm font-medium shadow-sm"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Clear selection"
          className="h-9 gap-1.5 rounded-xl text-sm font-medium text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear selection
        </Button>
      </div>
    </div>
  );
});