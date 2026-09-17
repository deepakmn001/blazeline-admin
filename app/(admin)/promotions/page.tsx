"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import api from "@/lib/api";

type PromotionStatus = "active" | "scheduled" | "expired" | "draft";
type PromotionType = "percentage" | "fixed_amount";

type ApiPromotion = {
  id: number;
  name: string;
  description: string;
  discount_type: PromotionType;
  discount_value: string | number;
  max_discount_amount: string | number | null;
  minimum_cart_value: string | number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  priority: number;
  stackable: boolean;
  is_currently_active: boolean;
  rules: unknown[];
  created_at: string;
  updated_at: string;
};

type Promotion = {
  id: number;
  name: string;
  description: string;
  type: PromotionType;
  value: string;
  status: PromotionStatus;
  startAt: string;
  endAt: string;
  priority: number;
  stackable: boolean;
  minimumCartValue: string;
  maxDiscount: string;
  ruleCount: number;
};

type PaginatedPromotionResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiPromotion[];
};

const PAGE_SIZE = 10;

const statusConfig: Record<
  PromotionStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock3,
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className:
      "border-slate-200 bg-slate-100 text-slate-600",
  },
  draft: {
    label: "Draft",
    icon: CalendarClock,
    className:
      "border-violet-200 bg-violet-50 text-violet-700",
  },
};

function formatCurrency(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPromotionStatus(
  promotion: ApiPromotion
): PromotionStatus {
  if (promotion.is_currently_active) {
    return "active";
  }

  if (!promotion.is_active) {
    return "draft";
  }

  if (
    promotion.start_at &&
    new Date(promotion.start_at).getTime() > Date.now()
  ) {
    return "scheduled";
  }

  if (
    promotion.end_at &&
    new Date(promotion.end_at).getTime() <= Date.now()
  ) {
    return "expired";
  }

  return "draft";
}

function normalizePromotion(
  promotion: ApiPromotion
): Promotion {
  const type = promotion.discount_type;

  const value =
    type === "percentage"
      ? `${Number(promotion.discount_value).toLocaleString(
          "en-IN"
        )}%`
      : formatCurrency(promotion.discount_value);

  return {
    id: promotion.id,
    name: promotion.name,
    description: promotion.description || "No description",
    type,
    value,
    status: getPromotionStatus(promotion),
    startAt: formatDate(promotion.start_at),
    endAt: formatDate(promotion.end_at),
    priority: promotion.priority,
    stackable: promotion.stackable,
    minimumCartValue: formatCurrency(
      promotion.minimum_cart_value
    ),
    maxDiscount: formatCurrency(
      promotion.max_discount_amount
    ),
    ruleCount: Array.isArray(promotion.rules)
      ? promotion.rules.length
      : 0,
  };
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>(
    []
  );

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    "all" | PromotionStatus
  >("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const fetchPromotions = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await api.get<PaginatedPromotionResponse>(
            "/promotions/",
            {
              params: {
                page,
              },
            }
          );

        const data = response.data;

        const results = Array.isArray(
          data?.results
        )
          ? data.results
          : [];

        setPromotions(
          results.map(normalizePromotion)
        );

        setTotalCount(
          Number(data?.count ?? results.length)
        );

        setHasNext(Boolean(data?.next));
        setHasPrevious(Boolean(data?.previous));
      } catch (requestError) {
        console.error(
          "Failed to load promotions:",
          requestError
        );

        setError(
          "We couldn't load promotions right now. Please try again."
        );

        setPromotions([]);
        setTotalCount(0);
        setHasNext(false);
        setHasPrevious(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const filteredPromotions = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase();

    return promotions.filter((promotion) => {
      const matchesQuery =
        !normalizedQuery ||
        promotion.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        promotion.description
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        status === "all" ||
        promotion.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [promotions, query, status]);

  const activeCount = promotions.filter(
    (promotion) => promotion.status === "active"
  ).length;

  const scheduledCount = promotions.filter(
    (promotion) => promotion.status === "scheduled"
  ).length;

  const expiredCount = promotions.filter(
    (promotion) => promotion.status === "expired"
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  return (
    <div className="min-h-full space-y-7">
      {/* Header */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-muted">
            <Tag className="h-4 w-4" />
            Marketing
            <span>/</span>
            Promotions
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Promotions
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Create, manage and monitor BlazeLine discount
            campaigns from one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              fetchPromotions({ silent: true })
            }
            disabled={refreshing || loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <Link
            href="/promotions/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Promotion
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Tag}
          label="Total promotions"
          value={totalCount.toLocaleString("en-IN")}
          helper="Configured campaigns"
          trend="Live data"
        />

        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={activeCount.toLocaleString("en-IN")}
          helper="Currently running"
          trend="Now"
        />

        <StatCard
          icon={CalendarClock}
          label="Scheduled"
          value={scheduledCount.toLocaleString("en-IN")}
          helper="Upcoming campaigns"
          trend="Planned"
        />

        <StatCard
          icon={TrendingUp}
          label="Expired"
          value={expiredCount.toLocaleString("en-IN")}
          helper="Historical campaigns"
          trend="Archive"
        />
      </section>

      {/* Main Card */}
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        {/* Toolbar */}
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                All promotions
              </h2>

              <p className="mt-1 text-sm text-ink-muted">
                Manage active and historical discount
                campaigns.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Search */}
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search promotions..."
                  className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(
                      event.target.value as
                        | "all"
                        | PromotionStatus
                    );
                    setPage(1);
                  }}
                  className="h-10 appearance-none rounded-xl border border-line bg-canvas pl-9 pr-9 text-sm font-medium text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All status</option>
                  <option value="active">
                    Active
                  </option>
                  <option value="scheduled">
                    Scheduled
                  </option>
                  <option value="expired">
                    Expired
                  </option>
                  <option value="draft">Draft</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <PromotionTableSkeleton />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => fetchPromotions()}
          />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              {filteredPromotions.length > 0 ? (
                <table className="w-full min-w-[1080px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas/60 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Promotion
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Offer
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Status
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Validity
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Rules
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Priority
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {filteredPromotions.map(
                      (promotion) => (
                        <PromotionRow
                          key={promotion.id}
                          promotion={promotion}
                        />
                      )
                    )}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  hasQuery={Boolean(query.trim())}
                  hasFilter={status !== "all"}
                  onReset={() => {
                    setQuery("");
                    setStatus("all");
                  }}
                />
              )}
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-muted">
                  Page{" "}
                  <span className="font-semibold text-ink">
                    {page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-ink">
                    {totalPages}
                  </span>{" "}
                  · {totalCount.toLocaleString("en-IN")}{" "}
                  promotions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasPrevious || loading}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!hasNext || loading}
                    onClick={() =>
                      setPage((current) =>
                        current + 1
                      )
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  trend,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
  helper: string;
  trend: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
          <ArrowUpRight className="h-3 w-3" />
          {trend}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-sm text-ink-muted">
          {label}
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {value}
        </p>

        <p className="mt-1 text-xs text-ink-muted">
          {helper}
        </p>
      </div>
    </div>
  );
}

function PromotionRow({
  promotion,
}: {
  promotion: Promotion;
}) {
  const config = statusConfig[promotion.status];
  const StatusIcon = config.icon;

  return (
    <tr className="group transition hover:bg-canvas/40">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Tag className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {promotion.name}
            </p>

            <p className="mt-0.5 max-w-[340px] truncate text-xs text-ink-muted">
              {promotion.description}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-ink-muted" />

          <div>
            <p className="text-sm font-semibold text-ink">
              {promotion.value}
            </p>

            <p className="text-xs capitalize text-ink-muted">
              {promotion.type.replace(
                "_",
                " "
              )}
            </p>

            <p className="mt-0.5 text-[11px] text-ink-muted">
              Min.{" "}
              {promotion.minimumCartValue}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </td>

      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-medium text-ink">
            {promotion.startAt}
          </p>

          <p className="mt-0.5 text-xs text-ink-muted">
            until {promotion.endAt}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">
            {promotion.ruleCount}
          </p>

          <p className="mt-0.5 text-xs text-ink-muted">
            targeting rule
            {promotion.ruleCount === 1
              ? ""
              : "s"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">
            {promotion.priority}
          </p>

          <p className="mt-0.5 text-xs text-ink-muted">
            {promotion.stackable
              ? "Stackable"
              : "Non-stackable"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          href={`/admin/promotions/${promotion.id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          aria-label={`Open ${promotion.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

function PromotionTableSkeleton() {
  return (
    <div className="p-5">
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="h-16 animate-pulse rounded-xl bg-canvas"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <XCircle className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-ink">
        Unable to load promotions
      </h3>

      <p className="mt-1 max-w-md text-sm text-ink-muted">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

function EmptyState({
  hasQuery,
  hasFilter,
  onReset,
}: {
  hasQuery: boolean;
  hasFilter: boolean;
  onReset: () => void;
}) {
  const filtered = hasQuery || hasFilter;

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Search className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-ink">
        {filtered
          ? "No matching promotions"
          : "No promotions yet"}
      </h3>

      <p className="mt-1 max-w-md text-sm text-ink-muted">
        {filtered
          ? "Try adjusting your search or status filter."
          : "Create your first BlazeLine promotion to start managing discounts."}
      </p>

      {filtered ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
        >
          Clear filters
        </button>
      ) : (
        <Link
          href="/promotions/new"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Create Promotion
        </Link>
      )}
    </div>
  );
}