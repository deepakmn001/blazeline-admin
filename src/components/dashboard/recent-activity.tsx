import { Clock } from "lucide-react";

export function RecentActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
        <Clock className="h-6 w-6 text-ink-faint" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-ink">
        No Recent Activity
      </h3>

      <p className="mt-1 max-w-xs text-xs text-ink-faint">
        Activity logs will appear here once products are created,
        updated, published, or deleted.
      </p>
    </div>
  );
}