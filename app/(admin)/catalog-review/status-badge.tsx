import { cn } from "@/lib/utils";

type Status =
  | "pending"
  | "valid"
  | "invalid"
  | "imported";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({
  status,
}: StatusBadgeProps) {
  const value = status.toLowerCase() as Status;

  const styles: Record<Status, string> = {
    pending:
      "bg-amber-50 text-amber-700 border border-amber-200",

    valid:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",

    invalid:
      "bg-red-50 text-red-700 border border-red-200",

    imported:
      "bg-blue-50 text-blue-700 border border-blue-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        styles[value] ??
          "bg-slate-100 text-slate-700 border border-slate-200"
      )}
    >
      {status}
    </span>
  );
}