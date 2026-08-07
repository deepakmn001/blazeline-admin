// src/components/products/product-toolbar.tsx
"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  EyeOff,
  FileEdit,
  PackageX,
  Plus,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getCategories } from "@/services/category.service";
import { getSubCategories } from "@/services/subcategory.service";

import type { Category } from "@/types/category";
import type { SubCategory } from "@/types/subcategory";

/* ------------------------------------------------------------------ */
/* Local UI types — do not touch @/types/catalog, category, subcategory */
/* ------------------------------------------------------------------ */

export type StatusFilterValue = "" | "published" | "draft" | "hidden";
export type StockFilterValue = "" | "in_stock" | "low_stock" | "out_of_stock";

interface FilterOption {
  label: string;
  value: string;
}

interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

/** Optional stat counts for Quick Stats. Any field left out renders as "—". */
export interface ToolbarStats {
  total?: number;
  published?: number;
  draft?: number;
  hidden?: number;
  outOfStock?: number;
}

interface ProductToolbarProps {
  stats?: ToolbarStats;

  search: string;
  onSearchChange: (value: string) => void;

  // Toolbar owns its own category/subcategory *data* fetching — the
  // parent only ever needs to know the selected id, not the full lists.
  selectedCategory: number | "";
  onCategoryChange: (value: number | "") => void;

  selectedSubCategory: number | "";
  onSubCategoryChange: (value: number | "") => void;

  status: StatusFilterValue;
  onStatusChange: (value: StatusFilterValue) => void;

  stock: StockFilterValue;
  onStockChange: (value: StockFilterValue) => void;

  // Sort — fully controlled, same pattern as every other filter here.
  // Toolbar never calls an API for this; it only reports the selected
  // ordering value back up via onOrderingChange.
  ordering: string;
  onOrderingChange: (value: string) => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const CONTROL_HEIGHT = "h-11";

const STATUS_OPTIONS: FilterOption[] = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Hidden", value: "hidden" },
];

const STOCK_OPTIONS: FilterOption[] = [
  { label: "In stock", value: "in_stock" },
  { label: "Low stock", value: "low_stock" },
  { label: "Out of stock", value: "out_of_stock" },
];

// Empty string is the default ordering ("Newest"). Kept out of the
// options list itself since FilterSelect already renders the placeholder
// as the "all/default" entry — same pattern as Status/Stock above.
const ORDERING_OPTIONS: FilterOption[] = [
  { label: "Oldest", value: "created_at" },
  { label: "Name A–Z", value: "name" },
  { label: "Name Z–A", value: "-name" },
  { label: "Recently Updated", value: "-updated_at" },
  { label: "Least Recently Updated", value: "updated_at" },
];

const STATUS_LABELS: Record<Exclude<StatusFilterValue, "">, string> = {
  published: "Published",
  draft: "Draft",
  hidden: "Hidden",
};

const STOCK_LABELS: Record<Exclude<StockFilterValue, "">, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

// Chip label lookup for ordering — built from ORDERING_OPTIONS so it
// can never drift out of sync with the dropdown itself.
const ORDERING_LABELS: Record<string, string> = Object.fromEntries(
  ORDERING_OPTIONS.map((option) => [option.value, option.label])
);

/** Shared width so every select lines up the same way at each breakpoint. */
const FIELD_CLASS = "min-w-0 sm:w-[calc(50%-0.375rem)] xl:w-44 xl:flex-1";

/* ------------------------------------------------------------------ */
/* Reusable filter select                                               */
/* ------------------------------------------------------------------ */

const ALL_VALUE = "__all__";

interface FilterSelectProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const FilterSelect = memo(function FilterSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  className,
}: FilterSelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={className}>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>

      <Select
        value={value === "" ? ALL_VALUE : value}
        onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          className={`${CONTROL_HEIGHT} w-full rounded-xl border-line bg-white text-sm font-medium text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.label : undefined}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Quick stat card                                                      */
/* ------------------------------------------------------------------ */

type StatTone = "neutral" | "positive" | "warning" | "critical";

const TONE_STYLES: Record<StatTone, string> = {
  neutral: "text-ink",
  positive: "text-emerald-600",
  warning: "text-amber-600",
  critical: "text-destructive",
};

const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value?: number;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
        <Icon className="h-4 w-4 text-ink-faint" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className={`text-lg font-semibold leading-tight ${TONE_STYLES[tone]}`}>
          {value === undefined ? "—" : value.toLocaleString()}
        </p>
        <p className="truncate text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* Presentational for filter *selection* (fully controlled by parent),  */
/* but self-sufficient for filter *option data* (categories/subcats).   */
/* Makes no product API calls — only category/subcategory lookups,      */
/* which are its own concern and scale independently of ProductsClient. */
/* ------------------------------------------------------------------ */

export function ProductToolbar({
  stats,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  status,
  onStatusChange,
  stock,
  onStockChange,
  ordering,
  onOrderingChange,
}: ProductToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  // Load categories once — independent of any product fetch lifecycle.
  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const { categories } = await getCategories();
        if (isMounted) setCategories(categories);
      } catch (error) {
        console.error(error);
      }
    }

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Category → Subcategory cascade, driven by the *controlled* selectedCategory.
  useEffect(() => {
    let isMounted = true;

    async function loadSubCategories(categoryId: number) {
      try {
        const { subcategories } = await getSubCategories({ category: categoryId });
        if (isMounted) setSubCategories(subcategories);
      } catch (error) {
        console.error(error);
      }
    }

    if (selectedCategory !== "") {
      loadSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  // ⌘K / Ctrl+K focuses search — command-palette feel, purely frontend.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fixed: ordering wasn't being reset here, so a selected sort would
  // silently survive a "Clear filters" click.
  const clearFilters = () => {
    onCategoryChange("");
    onSubCategoryChange("");
    onStatusChange("");
    onStockChange("");
    onOrderingChange("");
  };

  const categoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.name,
    [categories, selectedCategory]
  );

  const subCategoryName = useMemo(
    () => subCategories.find((sc) => sc.id === selectedSubCategory)?.name,
    [subCategories, selectedSubCategory]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];

    if (selectedCategory && categoryName) {
      chips.push({
        id: "category",
        label: "Category",
        value: categoryName,
        onRemove: () => onCategoryChange(""),
      });
    }

    if (selectedSubCategory && subCategoryName) {
      chips.push({
        id: "subcategory",
        label: "Subcategory",
        value: subCategoryName,
        onRemove: () => onSubCategoryChange(""),
      });
    }

    if (status) {
      chips.push({
        id: "status",
        label: "Status",
        value: STATUS_LABELS[status],
        onRemove: () => onStatusChange(""),
      });
    }

    if (stock) {
      chips.push({
        id: "stock",
        label: "Stock",
        value: STOCK_LABELS[stock],
        onRemove: () => onStockChange(""),
      });
    }

    if (ordering) {
      chips.push({
        id: "ordering",
        label: "Sort",
        value: ORDERING_LABELS[ordering] ?? ordering,
        onRemove: () => onOrderingChange(""),
      });
    }

    return chips;
  }, [
    selectedCategory,
    categoryName,
    selectedSubCategory,
    subCategoryName,
    status,
    stock,
    ordering,
    onCategoryChange,
    onSubCategoryChange,
    onStatusChange,
    onStockChange,
    onOrderingChange,
  ]);

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Products
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            Manage every product available on BlazeLine.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="h-11 w-full gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm sm:w-auto"
        >
          <Link href="/products/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Product
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Label htmlFor="product-search" className="sr-only">
          Search products
        </Label>

        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />

        <Input
          id="product-search"
          ref={searchInputRef}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products, SKU, brand..."
          className="h-12 w-full rounded-2xl border-line bg-white pl-11 pr-14 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-1"
        />

        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-line bg-neutral-50 px-1.5 py-0.5 text-[11px] font-medium text-ink-faint sm:inline-flex"
        >
          <span>⌘</span>K
        </kbd>
      </div>

      {/* Filter bar */}
      <div
        role="group"
        aria-label="Product filters"
        className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap"
      >
        <FilterSelect
          id="filter-category"
          label="Category"
          placeholder="All categories"
          value={selectedCategory === "" ? "" : String(selectedCategory)}
          options={categories.map((c) => ({ label: c.name, value: String(c.id) }))}
          onChange={(next) => onCategoryChange(next ? Number(next) : "")}
          className={FIELD_CLASS}
        />

        <FilterSelect
          id="filter-subcategory"
          label="Subcategory"
          placeholder="All subcategories"
          value={selectedSubCategory === "" ? "" : String(selectedSubCategory)}
          options={subCategories.map((sc) => ({ label: sc.name, value: String(sc.id) }))}
          onChange={(next) => onSubCategoryChange(next ? Number(next) : "")}
          disabled={!selectedCategory}
          className={FIELD_CLASS}
        />

        <FilterSelect
          id="filter-status"
          label="Status"
          placeholder="All statuses"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(next) => onStatusChange(next as StatusFilterValue)}
          className={FIELD_CLASS}
        />

        <FilterSelect
          id="filter-stock"
          label="Stock"
          placeholder="All stock levels"
          value={stock}
          options={STOCK_OPTIONS}
          onChange={(next) => onStockChange(next as StockFilterValue)}
          className={FIELD_CLASS}
        />

        <FilterSelect
          id="filter-ordering"
          label="Sort"
          placeholder="Newest"
          value={ordering}
          options={ORDERING_OPTIONS}
          onChange={(next) => onOrderingChange(next)}
          className={FIELD_CLASS}
        />

        <FilterSelect
          id="filter-brand"
          label="Brand"
          placeholder="Coming soon"
          value=""
          options={[]}
          onChange={() => {}}
          disabled
          className={FIELD_CLASS}
        />

        <Button
          type="button"
          variant="ghost"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="h-11 shrink-0 gap-2 rounded-xl text-sm font-medium text-ink-faint hover:text-ink disabled:opacity-40 xl:ml-auto"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear filters
        </Button>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remove ${chip.label} filter: ${chip.value}`}
              className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-neutral-50 pl-3 pr-2 text-xs font-medium text-ink transition-colors hover:border-destructive/40 hover:bg-destructive/5"
            >
              <span className="text-ink-faint">{chip.label}:</span>
              <span>{chip.value}</span>
              <X className="h-3.5 w-3.5 text-ink-faint transition-colors group-hover:text-destructive" aria-hidden="true" />
            </button>
          ))}

          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-ink-faint underline-offset-2 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Product summary">
        <StatCard label="Products" value={stats?.total} icon={Boxes} />
        <StatCard label="Published" value={stats?.published} icon={CheckCircle2} tone="positive" />
        <StatCard label="Draft" value={stats?.draft} icon={FileEdit} tone="warning" />
        <StatCard label="Hidden" value={stats?.hidden} icon={EyeOff} />
        <StatCard label="Out of stock" value={stats?.outOfStock} icon={PackageX} tone="critical" />
      </div>
    </div>
  );
}