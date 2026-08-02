import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCard {
  label: string;
  value: number | string;
  delta: string;
  hint: string;
  trend: "up" | "down" | "flat";
}

export function StatCardItem({ stat }: { stat: StatCard }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-surface p-5",
        "shadow-card transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-brand-200/70 hover:shadow-lift"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2.5px] origin-left scale-x-0 bg-brand-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
      />

      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
        {stat.label}
      </p>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
          {stat.value}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-[3px] text-[11px] font-semibold tabular-nums",
            stat.trend === "up" && "bg-success-bg text-success",
            stat.trend === "down" && "bg-danger-bg text-danger",
            stat.trend === "flat" && "bg-black/[0.05] text-ink-faint"
          )}
        >
          {stat.trend === "up" && (
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
          )}

          {stat.trend === "down" && (
            <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
          )}

          {stat.trend === "flat" && (
            <Minus className="h-3 w-3" strokeWidth={2.5} />
          )}

          {stat.delta}
        </span>

        <span className="truncate text-[11px] text-ink-faint">
          {stat.hint}
        </span>
      </div>
    </div>
  );
}