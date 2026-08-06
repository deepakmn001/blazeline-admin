"use client";

import { LucideIcon, TrendingUp } from "lucide-react";

interface StatItem {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: "brand" | "success" | "warning" | "danger" | "info";
}

interface EntityStatsProps {
  items: StatItem[];
}

const colorClasses = {
  brand: {
    bg: "bg-brand-50",
    icon: "text-brand-600",
  },
  success: {
    bg: "bg-success-bg",
    icon: "text-success",
  },
  warning: {
    bg: "bg-warning-bg",
    icon: "text-warning",
  },
  danger: {
    bg: "bg-danger-bg",
    icon: "text-danger",
  },
  info: {
    bg: "bg-info-bg",
    icon: "text-info",
  },
};

export function EntityStats({
  items,
}: EntityStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const colors =
          colorClasses[item.color ?? "brand"];

        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}
              >
                <Icon
                  className={`h-5 w-5 ${colors.icon}`}
                />
              </div>

              <TrendingUp className="h-4 w-4 text-success" />
            </div>

            <div className="mt-6">

              <h3 className="text-3xl font-bold tracking-tight text-ink">
                {item.value}
              </h3>

              <p className="mt-1 text-sm font-medium text-ink">
                {item.title}
              </p>

              {item.description && (
                <p className="mt-2 text-xs text-ink-faint">
                  {item.description}
                </p>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
}