"use client";

import { BarChart3 } from "lucide-react";

export function VisitorsChart() {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
        <BarChart3 className="h-6 w-6 text-ink-faint" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-ink">
        Visitor Analytics Coming Soon
      </h3>

      <p className="mt-1 max-w-xs text-xs text-ink-faint">
        Visitor analytics will appear here once website tracking is
        integrated with BlazeLine.
      </p>
    </div>
  );
}