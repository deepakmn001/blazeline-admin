"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  MonitorDot,
  RefreshCcw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDashboardSecuritySummary,
  type DashboardSecuritySummary,
} from "@/services/dashboard-security.service";

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
  href?: string;
  tone:
    | "brand"
    | "emerald"
    | "amber"
    | "red"
    | "slate";
}) {
  const toneClasses = {
    brand: {
      icon: "bg-brand-50 text-brand-600",
      value: "text-ink",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },
    red: {
      icon: "bg-red-50 text-red-600",
      value: "text-red-700",
    },
    slate: {
      icon: "bg-slate-100 text-slate-600",
      value: "text-ink",
    },
  }[tone];

  const content = (
    <>
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses.icon}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </p>

      <p className={`mt-1 text-2xl font-semibold ${toneClasses.value}`}>
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs text-ink-soft">{helper}</p>
    </>
  );

  if (!href) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
    >
      {content}
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-4 h-3 w-28 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-36 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function CustomerSecurityMetrics() {
  const [data, setData] =
    React.useState<DashboardSecuritySummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getDashboardSecuritySummary();
      setData(response);
    } catch (error) {
      console.error("Dashboard security summary failed:", error);

      if (!silent) {
        toast.error("Unable to load security metrics.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load(true);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [load]);

  const cards = data
    ? [
        {
          icon: MonitorDot,
          label: "Active customer sessions",
          value: data.auth.active_sessions,
          helper: `${data.auth.online_sessions.toLocaleString(
            "en-IN"
          )} currently online`,
          href: "/customers",
          tone: "brand" as const,
        },
        {
          icon: UsersRound,
          label: "Online customers",
          value: data.auth.online_customers,
          helper: "Based on server-side activity window",
          href: "/customers",
          tone: "emerald" as const,
        },
        {
          icon: AlertTriangle,
          label: "Failed logins · 24h",
          value: data.auth.failed_logins_24h,
          helper: "All failed authentication attempts",
          href: "/customers",
          tone: "red" as const,
        },
        {
          icon: Ban,
          label: "Sessions revoked · 24h",
          value: data.auth.sessions_revoked_24h,
          helper: "Recorded security revocations",
          href: "/customers",
          tone: "amber" as const,
        },
      ]
    : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            <ShieldCheck className="h-3.5 w-3.5" />
            Customer Security
          </div>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Authentication health
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Server-authoritative customer authentication and session metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-3.5 w-3.5 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))
          : cards.map((card) => (
              <MetricCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                helper={card.helper}
                href={card.href}
                tone={card.tone}
              />
            ))}
      </div>
    </section>
  );
}
