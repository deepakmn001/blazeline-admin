// src/components/products/product-table.tsx
"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CornerDownRight,
  Package,
  PackageX,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import type { Product } from "@/types/catalog";
import { ProductActions } from "./product-actions";

type ProductId = Product["id"];
type DeleteTarget = { id: ProductId; slug: string };
type DeleteHandler = (target: DeleteTarget) => Promise<void>;

// Memoized so a delete/select interaction on one row never re-renders the
// action buttons of every other row. `onDelete` must stay referentially
// stable in the parent (empty-deps useCallback) for this to actually help.
const MemoizedProductActions = memo(ProductActions);

interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Fully controlled selection — owned by the parent, never here. */
  selectedIds: ReadonlySet<ProductId>;
  onToggleRow: (id: ProductId) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  /** Parent owns the delete mutation (optimistic update + rollback). */
  onDeleteProduct: DeleteHandler;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers — single reusable instance, not recreated per     */
/* render or per row.                                                   */
/* ------------------------------------------------------------------ */

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === "") return "—";
  const numeric = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(numeric)) return "—";
  return CURRENCY_FORMATTER.format(numeric);
}

/* ------------------------------------------------------------------ */
/* Stock visualization                                                  */
/* ------------------------------------------------------------------ */

const LOW_STOCK_THRESHOLD = 10;

type StockTone = "critical" | "warning" | "healthy";

const STOCK_TONE_STYLES: Record<StockTone, { dot: string; text: string }> = {
  critical: { dot: "bg-destructive", text: "text-destructive" },
  warning: { dot: "bg-amber-500", text: "text-amber-600" },
  healthy: { dot: "bg-emerald-500", text: "text-emerald-600" },
};

function getStockDisplay(stock: number | null | undefined): {
  label: string;
  tone: StockTone;
} {
  const value = stock ?? 0;

  if (value <= 0) {
    return { label: "Out of stock", tone: "critical" };
  }

  if (value <= LOW_STOCK_THRESHOLD) {
    return { label: `Low · ${value} left`, tone: "warning" };
  }

  return { label: `${value} in stock`, tone: "healthy" };
}

const StockIndicator = memo(function StockIndicator({
  stock,
}: {
  stock: number | null | undefined;
}) {
  const { label, tone } = getStockDisplay(stock);
  const styles = STOCK_TONE_STYLES[tone];

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span className={styles.text}>{label}</span>
    </span>
  );
});

/* ------------------------------------------------------------------ */
/* Status badge                                                         */
/* ------------------------------------------------------------------ */

type ProductStatus = Product["status"];

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  hidden: "Hidden",
};

const STATUS_DOT: Record<string, string> = {
  published: "bg-emerald-500",
  draft: "bg-amber-500",
  hidden: "bg-neutral-400",
};

const StatusBadge = memo(function StatusBadge({ status }: { status: ProductStatus }) {
  const key = String(status);
  const variant = key === "published" ? "success" : key === "draft" ? "warning" : "danger";
  const dot = STATUS_DOT[key] ?? "bg-neutral-400";
  const label = STATUS_LABELS[key] ?? key;

  return (
    <Badge variant={variant}>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
    </Badge>
  );
});

/* ------------------------------------------------------------------ */
/* Product identity cell (checkbox + image + name + SKU)                */
/* ------------------------------------------------------------------ */

const ProductIdentityCell = memo(function ProductIdentityCell({
  product,
  isSelected,
  onToggleRow,
}: {
  product: Product;
  isSelected: boolean;
  onToggleRow: (id: ProductId) => void;
}) {
  const variant = product.variants?.[0];

  const image =
    variant?.images?.find((img) => img.featured)?.image_url ??
    variant?.images?.[0]?.image_url ??
    null;

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleRow(product.id)}
        aria-label={`Select ${product.name}`}
        onClick={(e) => e.stopPropagation()}
      />

      {image ? (
        <Image
          src={image}
          alt={product.name}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-neutral-100">
          <Package className="h-6 w-6 text-neutral-400" aria-hidden="true" />
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h3
            className="max-w-[220px] truncate text-sm font-semibold text-ink"
            title={product.name}
          >
            {product.name}
          </h3>

          {product.featured && (
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
              aria-label="Featured product"
            />
          )}
        </div>

        <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
          {variant?.sku || "No SKU"}
        </p>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Category / subcategory hierarchy cell                                */
/* ------------------------------------------------------------------ */

const CategoryCell = memo(function CategoryCell({ product }: { product: Product }) {
  const categoryName = product.category?.name;
  const subCategoryName = product.subcategory?.name;

  if (!categoryName) {
    return <span className="text-sm italic text-ink-faint">Uncategorized</span>;
  }

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-ink" title={categoryName}>
        {categoryName}
      </div>

      {subCategoryName && (
        <div
          className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-faint"
          title={subCategoryName}
        >
          <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          {subCategoryName}
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Row — plain <tr>, no virtualization. Wrapped in React.memo with an   */
/* explicit comparator (rather than relying on the default shallow      */
/* check implicitly) so it's clear exactly which props gate a re-render:*/
/* the product reference itself, its selection flag, and the two        */
/* callbacks — both of which are guaranteed referentially stable by      */
/* ProductsClient (empty-deps useCallback), so a row only re-renders on  */
/* its own selection toggle or when its underlying data object changes. */
/* ------------------------------------------------------------------ */

const ProductRow = memo(function ProductRow({
  product,
  isSelected,
  onToggleRow,
  onDeleteProduct,
}: {
  product: Product;
  isSelected: boolean;
  onToggleRow: (id: ProductId) => void;
  onDeleteProduct: DeleteHandler;
}) {
  const variant = product.variants?.[0];

  return (
    <tr
      aria-selected={isSelected}
      className={`group border-b border-line last:border-b-0 transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary/30 ${
        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-neutral-50/80"
      }`}
    >
      <th
        scope="row"
        className={`sticky left-0 z-10 px-6 py-4 text-left font-normal shadow-[1px_0_0_0_theme(colors.line)] ${
          isSelected ? "bg-primary/5 group-hover:bg-primary/10" : "bg-white group-hover:bg-neutral-50/80"
        }`}
      >
        <ProductIdentityCell product={product} isSelected={isSelected} onToggleRow={onToggleRow} />
      </th>

      <td className="px-4 py-4 align-middle">
        <CategoryCell product={product} />
      </td>

      <td className="px-4 py-4 align-middle text-sm text-ink-faint">
        {variant?.name || "—"}
      </td>

      <td className="px-4 py-4 align-middle text-sm font-semibold text-ink">
        {formatPrice(variant?.selling_price)}
      </td>

      <td className="px-4 py-4 align-middle">
        <StockIndicator stock={variant?.stock} />
      </td>

      <td className="px-4 py-4 align-middle">
        <StatusBadge status={product.status} />
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex justify-end">
          <MemoizedProductActions
            productId={product.id}
            productSlug={product.slug}
            onDelete={onDeleteProduct}
          />
        </div>
      </td>
    </tr>
  );
},
function areRowPropsEqual(prev, next) {
  return (
    prev.product === next.product &&
    prev.isSelected === next.isSelected &&
    prev.onToggleRow === next.onToggleRow &&
    prev.onDeleteProduct === next.onDeleteProduct
  );
});

/* ------------------------------------------------------------------ */
/* Table states                                                         */
/* ------------------------------------------------------------------ */

function TableLoadingState() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-line last:border-b-0">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-neutral-100" />
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-neutral-100" />
              <div className="space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-neutral-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
          </td>
          <td className="px-4"><div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" /></td>
          <td className="px-4"><div className="h-3.5 w-16 animate-pulse rounded bg-neutral-100" /></td>
          <td className="px-4"><div className="h-3.5 w-14 animate-pulse rounded bg-neutral-100" /></td>
          <td className="px-4"><div className="h-3.5 w-20 animate-pulse rounded bg-neutral-100" /></td>
          <td className="px-4"><div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" /></td>
          <td className="px-4"><div className="ml-auto h-8 w-8 animate-pulse rounded-lg bg-neutral-100" /></td>
        </tr>
      ))}
    </tbody>
  );
}

function TableErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <tbody>
      <tr>
        <td colSpan={7} className="px-6 py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-neutral-50"
              >
                Retry
              </button>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );
}

function TableEmptyState() {
  return (
    <tbody>
      <tr>
        <td colSpan={7} className="px-6 py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <PackageX className="h-8 w-8 text-neutral-300" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">No products found</p>
            <p className="text-sm text-ink-faint">
              Try adjusting your filters or search terms.
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

/* ------------------------------------------------------------------ */
/* Column definitions — centralized so header labels and column count   */
/* stay in sync.                                                        */
/* ------------------------------------------------------------------ */

const COLUMNS: { key: string; label: string; align?: "right" }[] = [
  { key: "product", label: "Product" },
  { key: "category", label: "Category" },
  { key: "variant", label: "Variant" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", align: "right" },
];

/* ------------------------------------------------------------------ */
/* Main component — fully controlled: selection + delete live in the    */
/* parent. Plain <table>, no virtualization, no new dependency. At      */
/* scale (5k+ rows) correctness/perf comes entirely from: memoized row  */
/* subcomponents, a memoized row-level comparator, and referentially    */
/* stable callback props from ProductsClient — so a single row's        */
/* checkbox toggle or a single row's delete only re-renders that row.   */
/* ------------------------------------------------------------------ */

export function ProductTable({
  products,
  isLoading = false,
  error = null,
  onRetry,
  selectedIds,
  onToggleRow,
  onToggleSelectAll,
  isAllSelected,
  isIndeterminate,
  onDeleteProduct,
}: ProductTableProps) {
  const count = useMemo(() => products.length, [products.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">All Products</h2>
          <p className="mt-1 text-sm text-ink-faint">
            {isLoading ? "Loading products…" : `${count} product${count === 1 ? "" : "s"} available`}
          </p>
        </div>
      </div>

      <div
        role="region"
        aria-label="Products table, scroll horizontally to see more columns"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table className="w-full min-w-[1100px] border-collapse">
          <thead className="sticky top-0 z-20 bg-neutral-50">
            <tr>
              {COLUMNS.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-4 text-xs font-semibold uppercase tracking-wide text-ink-faint ${
                    index === 0
                      ? "sticky left-0 z-30 bg-neutral-50 px-6 text-left shadow-[1px_0_0_0_theme(colors.line)]"
                      : column.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {index === 0 ? (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isIndeterminate ? "indeterminate" : isAllSelected}
                        onCheckedChange={onToggleSelectAll}
                        disabled={count === 0}
                        aria-label={
                          isAllSelected
                            ? "Deselect all products on this page"
                            : "Select all products on this page"
                        }
                      />
                      <span>{column.label}</span>
                    </div>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? (
            <TableLoadingState />
          ) : error ? (
            <TableErrorState error={error} onRetry={onRetry} />
          ) : count === 0 ? (
            <TableEmptyState />
          ) : (
            <tbody>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isSelected={selectedIds.has(product.id)}
                  onToggleRow={onToggleRow}
                  onDeleteProduct={onDeleteProduct}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}