"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  RotateCw,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Layers,
  ArrowUpDown,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ParsedProductFacets,
  ParsedProductOrdering,
  ParsedProductStats,
} from "@/services/catalog-import.service";
import { getParsedProductsStats } from "@/services/catalog-import.service";

const ALL_VALUE = "__all__";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
];

const IMPORTED_OPTIONS = [
  { value: "true", label: "Imported" },
  { value: "false", label: "Not Imported" },
];

const SORT_OPTIONS: { value: ParsedProductOrdering; label: string }[] = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "product_name", label: "Name (A–Z)" },
  { value: "-product_name", label: "Name (Z–A)" },
  { value: "sku", label: "SKU (A–Z)" },
  { value: "-sku", label: "SKU (Z–A)" },
  { value: "-gd_price", label: "GD Price (High–Low)" },
  { value: "gd_price", label: "GD Price (Low–High)" },
];

interface Counter {
  key: keyof ParsedProductStats;
  label: string;
  icon: typeof Clock;
  className: string;
}

const COUNTERS: Counter[] = [
  { key: "pending", label: "Pending", icon: Clock, className: "text-amber-600 bg-amber-50 ring-amber-600/20" },
  { key: "valid", label: "Valid", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 ring-emerald-600/20" },
  { key: "invalid", label: "Invalid", icon: XCircle, className: "text-red-600 bg-red-50 ring-red-600/20" },
  { key: "imported", label: "Imported", icon: PackageCheck, className: "text-blue-600 bg-blue-50 ring-blue-600/20" },
  { key: "total", label: "Total", icon: Layers, className: "text-slate-600 bg-slate-100 ring-slate-500/20" },
];

interface ReviewToolbarProps {
  initialStats: ParsedProductStats;
  facets: ParsedProductFacets;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ReviewToolbar({
  initialStats,
  facets,
  onRefresh,
  isRefreshing = false,
}: ReviewToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [stats, setStats] = useState<ParsedProductStats>(initialStats);

  const currentStatus = searchParams.get("status") ?? ALL_VALUE;
  const currentCategory = searchParams.get("category") ?? ALL_VALUE;
  const currentFinish = searchParams.get("finish") ?? ALL_VALUE;
  const currentImported = searchParams.get("is_imported") ?? ALL_VALUE;
  const currentOrdering = (searchParams.get("ordering") as ParsedProductOrdering) ?? "-created_at";

  const filterQuery = useMemo(
    () => ({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      finish: searchParams.get("finish") ?? undefined,
      is_imported:
        searchParams.get("is_imported") === "true"
          ? true
          : searchParams.get("is_imported") === "false"
            ? false
            : undefined,
    }),
    [searchParams],
  );

  // Keep local stats in sync whenever the server hands us a fresh
  // initialStats (e.g. after router.refresh() re-runs the server component).
  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  // Debounced search -> URL sync.
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (search.trim()) {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }

      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Live counters re-fetch whenever a filter (not page/ordering) changes —
  // but NOT on initial mount, since `initialStats` already holds the
  // server-fetched value for the current filters. Without this guard the
  // stats endpoint gets hit twice on every page load (once server-side in
  // page.tsx, once here on mount).
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;

    getParsedProductsStats(filterQuery)
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => {
        /* Counters are non-critical — silently keep the last known values. */
      });

    return () => {
      cancelled = true;
    };
  }, [filterQuery]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!value || value === ALL_VALUE) {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      if (key !== "ordering") {
        params.delete("page");
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleReset = useCallback(() => {
    setSearch("");
    router.replace(pathname);
  }, [pathname, router]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    router.refresh();
  }, [onRefresh, router]);

  const hasActiveFilters =
    currentStatus !== ALL_VALUE ||
    currentCategory !== ALL_VALUE ||
    currentFinish !== ALL_VALUE ||
    currentImported !== ALL_VALUE ||
    Boolean(search.trim());

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Catalog Review
          </h1>

          <p className="mt-1 text-sm text-ink-faint">
            Review AI parsed products before publishing them into your
            catalog.
          </p>
        </div>

        {/* Live counters */}
        <div className="flex flex-wrap items-center gap-2">
          {COUNTERS.map(({ key, label, icon: Icon, className }) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset",
                className,
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {label}
              <span className="font-semibold tabular-nums">{stats[key]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or Product..."
            className="pl-10"
          />
        </div>

        <Select value={currentStatus} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="h-9 w-full lg:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentCategory} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger className="h-9 w-full lg:w-44" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Categories</SelectItem>
            {facets.categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentFinish} onValueChange={(v) => setParam("finish", v)}>
          <SelectTrigger className="h-9 w-full lg:w-44" aria-label="Filter by finish">
            <SelectValue placeholder="Finish" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Finishes</SelectItem>
            {facets.finishes.map((finish) => (
              <SelectItem key={finish} value={finish}>
                {finish}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentImported} onValueChange={(v) => setParam("is_imported", v)}>
          <SelectTrigger className="h-9 w-full lg:w-40" aria-label="Filter by imported status">
            <SelectValue placeholder="Imported" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Products</SelectItem>
            {IMPORTED_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentOrdering} onValueChange={(v) => setParam("ordering", v)}>
          <SelectTrigger className="h-9 w-full lg:w-48" aria-label="Sort products">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-0 flex items-center gap-2 lg:ml-auto">
          <Button
            variant="outline"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}