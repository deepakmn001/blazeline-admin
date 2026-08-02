"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { ParsedProduct } from "@/services/catalog-import.service";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  HelpCircle,
  ImageOff,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Rocket,
  RotateCw,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ============================================================================
 * TYPES
 * ==========================================================================*/

export type OcrQuality = "excellent" | "good" | "average" | "poor";

export type ProductId = ParsedProduct["id"];

export type ReviewProduct = ParsedProduct & {
  aiConfidence?: number | null;
  ocrQuality?: OcrQuality | null;
  variant?: string | null;
  standard_price?: number | null;
  mb_price?: number | null;
};

export type ReviewStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "imported"
  | "duplicate"
  | "needs_review"
  | (string & {});

export type BulkAction =
  | "publish"
  | "delete"
  | "mark_valid"
  | "mark_invalid"
  | "export_csv";

export type ReviewTableStatus = "idle" | "loading" | "error";

/* ============================================================================
 * StatusBadge
 * ==========================================================================*/

type StatusConfig = { label: string; icon: typeof CheckCircle2; className: string };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  valid: {
    label: "Valid",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  invalid: {
    label: "Invalid",
    icon: XCircle,
    className: "bg-red-50 text-red-700 ring-red-600/20",
  },
  imported: {
    label: "Imported",
    icon: PackageCheck,
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  duplicate: {
    label: "Duplicate",
    icon: Copy,
    className: "bg-purple-50 text-purple-700 ring-purple-600/20",
  },
  needs_review: {
    label: "Needs Review",
    icon: Eye,
    className: "bg-orange-50 text-orange-700 ring-orange-600/20",
  },
};

const STATUS_FALLBACK: StatusConfig = {
  label: "Unknown",
  icon: HelpCircle,
  className: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

const StatusBadge = memo(function StatusBadge({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  const key = String(status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const config = STATUS_CONFIG[key] ?? STATUS_FALLBACK;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
});

/* ============================================================================
 * FinishBadge
 * ==========================================================================*/

function finishSwatch(finish: string): string {
  const value = finish.toLowerCase();
  if (value.includes("rose gold")) return "#B76E79";
  if (value.includes("gold")) return "#C9A227";
  if (value.includes("chrome")) return "#C7CDD3";
  if (value.includes("matt black") || value.includes("matte black")) return "#1F2328";
  if (value.includes("black")) return "#1F2328";
  if (value.includes("nickel")) return "#8B8D8F";
  if (value.includes("bronze")) return "#8C6A4A";
  if (value.includes("copper")) return "#B87333";
  if (value.includes("white")) return "#F4F4F5";
  if (value.includes("silver")) return "#D6D9DC";
  return "#A3A9B0";
}

const FinishBadge = memo(function FinishBadge({
  finish,
  className,
}: {
  finish?: string | null;
  className?: string;
}) {
  const trimmed = finish?.trim();
  const swatch = useMemo(() => (trimmed ? finishSwatch(trimmed) : null), [trimmed]);

  if (!trimmed) {
    return (
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400",
          className,
        )}
      >
        Unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink",
        className,
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: swatch ?? undefined }}
        aria-hidden="true"
      />
      {trimmed}
    </span>
  );
});

/* ============================================================================
 * OcrQualityBadge
 * ==========================================================================*/

const OCR_CONFIG: Record<OcrQuality, { label: string; className: string }> = {
  excellent: { label: "Excellent", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  good: { label: "Good", className: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  average: { label: "Average", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  poor: { label: "Poor", className: "bg-red-50 text-red-700 ring-red-600/20" },
};

const OcrQualityBadge = memo(function OcrQualityBadge({
  quality,
  className,
}: {
  quality?: OcrQuality | null;
  className?: string;
}) {
  if (!quality || !OCR_CONFIG[quality]) {
    return <span className="text-sm text-ink-faint">—</span>;
  }
  const config = OCR_CONFIG[quality];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
});

/* ============================================================================
 * ConfidenceIndicator
 * ==========================================================================*/

function confidenceColor(value: number): string {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-red-500";
}

const ConfidenceIndicator = memo(function ConfidenceIndicator({
  value,
  className,
}: {
  value?: number | null;
  className?: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-sm text-ink-faint">—</span>;
  }
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex w-24 items-center gap-2", className)}>
      <span className="w-9 shrink-0 text-right text-sm font-medium tabular-nums text-ink">
        {clamped}%
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`AI confidence ${clamped}%`}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", confidenceColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
});

/* ============================================================================
 * SelectionCheckbox
 * ==========================================================================*/

const SelectionCheckbox = memo(function SelectionCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;
    node.dataset.indeterminate = indeterminate ? "true" : "false";
  }, [indeterminate]);

  return (
    <Checkbox
      ref={buttonRef}
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={(value: boolean | "indeterminate") => onCheckedChange(value === true)}
      aria-label={label}
      className={cn(
        "h-4 w-4 rounded-[4px] border-slate-300 data-[state=checked]:border-ink data-[state=checked]:bg-ink",
        "data-[indeterminate=true]:border-ink data-[indeterminate=true]:bg-ink",
        className,
      )}
    />
  );
});

/* ============================================================================
 * ImageCell
 * ==========================================================================*/

const ImageCell = memo(function ImageCell({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const [hovering, setHovering] = useState(false);
  const showImage = Boolean(src) && !errored;

  return (
    <div
      className={cn("group relative h-12 w-12 shrink-0", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          onError={() => setErrored(true)}
          className="h-12 w-12 rounded-lg border border-line object-cover"
        />
      ) : (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-line bg-slate-50 text-slate-300"
          aria-label="No image available"
        >
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        </div>
      )}

      {showImage && hovering && (
        <div
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          role="tooltip"
        >
          <img src={src ?? undefined} alt={alt} className="h-40 w-40 rounded-lg object-cover" />
        </div>
      )}
    </div>
  );
});

/* ============================================================================
 * ProductCell
 * ==========================================================================*/

const ProductCell = memo(function ProductCell({ product }: { product: ReviewProduct }) {
  const metaParts = [product.category, product.subcategory, product.variant].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return (
    <div className="flex min-w-0 max-w-xs flex-col gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="line-clamp-2 max-w-fit text-sm font-medium leading-snug text-ink">
            {product.product_name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {product.product_name}
        </TooltipContent>
      </Tooltip>

      {metaParts.length > 0 && (
        <span className="truncate text-xs text-ink-faint">{metaParts.join(" • ")}</span>
      )}

      <span className="truncate font-mono text-[11px] text-ink-faint/80">{product.sku}</span>
    </div>
  );
});

/* ============================================================================
 * PriceCell
 * ==========================================================================*/

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PriceCell = memo(function PriceCell({
  value,
  currency = "₹"
}: {
  value?: number | string | null;
  currency?: string;
}) {
  const formatted = useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) return null;
    return `${currency}${priceFormatter.format(numeric)}`;
  }, [value, currency]);

  return (
    <span className="block text-right text-sm tabular-nums text-ink">
      {formatted ?? <span className="text-ink-faint">—</span>}
    </span>
  );
});

/* ============================================================================
 * ReviewActions
 * ==========================================================================*/

function ActionIconButton({
  label,
  onClick,
  loading,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-ink-faint hover:bg-slate-100 hover:text-ink"
          aria-label={label}
          disabled={disabled || loading}
          onClick={onClick}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            children
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

const ReviewActions = memo(function ReviewActions({
  product,
  isPublishing = false,
  isDeleting = false,
  onReview,
  onEdit,
  onPublish,
  onDelete,
}: {
  product: ReviewProduct;
  isPublishing?: boolean;
  isDeleting?: boolean;
  onReview: (product: ReviewProduct) => void;
  onEdit: (product: ReviewProduct) => void;
  onPublish: (product: ReviewProduct) => void;
  onDelete: (product: ReviewProduct) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ActionIconButton label="Review" onClick={() => onReview(product)}>
        <Eye className="h-4 w-4" aria-hidden="true" />
      </ActionIconButton>

      <ActionIconButton label="Edit" onClick={() => onEdit(product)}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </ActionIconButton>

      <ActionIconButton label="Publish" onClick={() => onPublish(product)} loading={isPublishing}>
        <Rocket className="h-4 w-4" aria-hidden="true" />
      </ActionIconButton>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-faint hover:bg-slate-100 hover:text-ink"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">More actions</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onReview(product)}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            Review
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(product)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPublish(product)} disabled={isPublishing}>
            <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
            Publish
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(product)}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

/* ============================================================================
 * BulkToolbar
 * ==========================================================================*/

const BulkToolbar = memo(function BulkToolbar({
  selectedCount,
  onAction,
  onClear,
}: {
  selectedCount: number;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 border-b border-line bg-slate-50 px-4 py-2.5"
    >
      <span className="mr-1 text-sm font-medium text-ink">{selectedCount} selected</span>

      <Separator orientation="vertical" className="h-5" />

      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onAction("publish")}>
        <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
        Publish Selected
      </Button>

      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onAction("mark_valid")}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Mark Valid
      </Button>

      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onAction("mark_invalid")}>
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Mark Invalid
      </Button>

      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onAction("export_csv")}>
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Export CSV
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => onAction("delete")}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete Selected
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-8 gap-1.5 text-ink-faint hover:text-ink"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear Selection
      </Button>
    </div>
  );
});

/* ============================================================================
 * Pagination — now fully controlled: page/pageSize/totalItems come from the
 * parent (URL state), and onPageChange/onPageSizeChange are the only way
 * they change. No local page state lives here anymore.
 * ==========================================================================*/

function buildPageList(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) result.push("ellipsis");
    result.push(p);
    previous = p;
  }
  return result;
}

const Pagination = memo(function Pagination({
  page,
  pageSize,
  totalItems,
  selectedCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  selectedCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const pageList = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <div className="flex items-center gap-4 text-ink-faint">
        <span>
          {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
          {start}
          {"–"}
          {end} of {totalItems} products
        </span>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value: string) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        {pageList.map((entry, index) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-ink-faint" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "h-8 w-8 text-ink-faint",
                entry === page && "bg-slate-100 font-semibold text-ink",
              )}
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Jump to page */}
      <JumpToPage page={page} totalPages={totalPages} onJump={onPageChange} />
    </div>
  );
});

const JumpToPage = memo(function JumpToPage({
  page,
  totalPages,
  onJump,
}: {
  page: number;
  totalPages: number;
  onJump: (page: number) => void;
}) {
  const [value, setValue] = useState(String(page));

  useEffect(() => {
    setValue(String(page));
  }, [page]);

  const commit = useCallback(() => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      onJump(Math.min(Math.max(1, Math.trunc(parsed)), totalPages));
    } else {
      setValue(String(page));
    }
  }, [value, onJump, totalPages, page]);

  return (
    <div className="flex items-center gap-1.5 text-ink-faint">
      <span className="hidden sm:inline">Go to</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        aria-label="Jump to page"
        className="h-8 w-14 rounded-md border border-line bg-white px-2 text-center text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
      />
    </div>
  );
});

/* ============================================================================
 * TableSkeleton
 * ==========================================================================*/

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-100", className)} />;
}

const TableSkeleton = memo(function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="w-full" role="status" aria-label="Loading products">
      <div className="flex items-center gap-4 border-b border-line px-4 py-4">
        <Shimmer className="h-4 w-4 rounded" />
        <Shimmer className="h-9 w-9 rounded-lg" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-40" />
        <Shimmer className="ml-auto h-4 w-16" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-20" />
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-4">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-12 w-12 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-3.5 w-40" />
            <Shimmer className="h-3 w-24" />
          </div>
          <Shimmer className="ml-auto h-6 w-16 rounded-full" />
          <Shimmer className="h-6 w-16 rounded-full" />
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>
      ))}

      <span className="sr-only">Loading products…</span>
    </div>
  );
});

/* ============================================================================
 * EmptyState
 * ==========================================================================*/

const EmptyState = memo(function EmptyState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-line bg-slate-50">
        <UploadCloud className="h-8 w-8 text-slate-300" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink">No Parsed Products Found</p>
        <p className="text-sm text-ink-faint">Upload a catalog to begin.</p>
      </div>

      {onUploadClick && (
        <Button type="button" size="sm" className="mt-1 gap-1.5" onClick={onUploadClick}>
          <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
          Upload Catalog
        </Button>
      )}
    </div>
  );
});

/* ============================================================================
 * ErrorState
 * ==========================================================================*/

const ErrorState = memo(function ErrorState({
  message = "We couldn't load your products. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink">Something went wrong</p>
        <p className="max-w-sm text-sm text-ink-faint">{message}</p>
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-1 gap-1.5" onClick={onRetry}>
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
});

/* ============================================================================
 * ReviewRow
 * ==========================================================================*/

const ReviewRow = memo(function ReviewRow({
  product,
  selected,
  isPublishing,
  isDeleting,
  onToggleSelect,
  onReview,
  onEdit,
  onPublish,
  onDelete,
}: {
  product: ReviewProduct;
  selected: boolean;
  isPublishing?: boolean;
  isDeleting?: boolean;
  onToggleSelect: (id: ProductId, checked: boolean) => void;
  onReview: (product: ReviewProduct) => void;
  onEdit: (product: ReviewProduct) => void;
  onPublish: (product: ReviewProduct) => void;
  onDelete: (product: ReviewProduct) => void;
}) {
  return (
    <tr
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group border-b border-line transition-colors hover:bg-slate-50/80",
        "focus-within:bg-slate-50/80",
        selected && "bg-slate-50",
      )}
    >
      <td className="sticky left-0 z-10 w-12 bg-white px-4 py-3 group-hover:bg-slate-50/80 group-data-[state=selected]:bg-slate-50">
        <SelectionCheckbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect(product.id, checked)}
          label={`Select ${product.product_name}`}
        />
      </td>

      <td className="sticky left-12 z-10 bg-white px-4 py-3 group-hover:bg-slate-50/80 group-data-[state=selected]:bg-slate-50">
        <ImageCell src={product.image} alt={product.product_name} />
      </td>

      <td className="sticky left-[6.5rem] z-10 border-r border-line bg-white px-4 py-3 font-mono text-xs text-ink group-hover:bg-slate-50/80 group-data-[state=selected]:bg-slate-50">
        {product.sku}
      </td>

      <td className="px-4 py-3">
        <ProductCell product={product} />
      </td>

      <td className="px-4 py-3">
        <PriceCell value={product.standard_price} />
      </td>

      <td className="px-4 py-3">
        <PriceCell value={product.gd_price} />
      </td>

      <td className="px-4 py-3">
        <PriceCell value={product.rgd_price} />
      </td>

      <td className="px-4 py-3">
        <PriceCell value={product.mb_price} />
      </td>

      <td className="px-4 py-3">
        <FinishBadge finish={product.finish} />
      </td>

      <td className="px-4 py-3">
        <ConfidenceIndicator value={product.aiConfidence} />
      </td>

      <td className="px-4 py-3">
        <OcrQualityBadge quality={product.ocrQuality} />
      </td>

      <td className="px-4 py-3">
        <StatusBadge status={product.status} />
      </td>

      <td className="sticky right-0 z-10 border-l border-line bg-white px-4 py-3 group-hover:bg-slate-50/80 group-data-[state=selected]:bg-slate-50">
        <ReviewActions
          product={product}
          isPublishing={isPublishing}
          isDeleting={isDeleting}
          onReview={onReview}
          onEdit={onEdit}
          onPublish={onPublish}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
});

/* ============================================================================
 * ReviewTable — main export
 *
 * Pagination is now FULLY CONTROLLED by the parent (URL-driven):
 * `products` is expected to be exactly the current page's rows (already
 * paginated by the backend), and `page`/`pageSize`/`totalItems` describe
 * server state. All page/page-size changes go up through
 * onPageChange/onPageSizeChange instead of being handled locally.
 * ==========================================================================*/

type Props = {
  products: ParsedProduct[];

  /** Server-side pagination state — all controlled by the parent. */
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  status?: ReviewTableStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onUploadClick?: () => void;

  onReview?: (product: ReviewProduct) => void;
  onEdit?: (product: ReviewProduct) => void;
  onPublish?: (product: ReviewProduct) => void;
  onDelete?: (product: ReviewProduct) => void;
  onBulkAction?: (action: BulkAction, ids: ProductId[]) => void;

  publishingIds?: ProductId[];
  deletingIds?: ProductId[];

  pageSizeOptions?: number[];

  /** Lifted so the parent (drawer / bulk toolbar) can read selection too. */
  selectedIds?: Set<ProductId>;
  onSelectedIdsChange?: (ids: Set<ProductId>) => void;
};

const noop = () => {};

export function ReviewTable({
  products,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  status = "idle",
  errorMessage,
  onRetry = noop,
  onUploadClick,
  onReview = noop,
  onEdit = noop,
  onPublish = noop,
  onDelete = noop,
  onBulkAction = noop,
  publishingIds,
  deletingIds,
  pageSizeOptions = [10, 25, 50, 100],
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
}: Props) {
  const rows = products as ReviewProduct[];
  console.log("ROWS LENGTH:", rows.length);
console.log("ROWS:", rows.map((r) => r.sku));

  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<ProductId>>(new Set());
  const [scrolled, setScrolled] = useState(false);

  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedIds = useCallback(
    (updater: (prev: Set<ProductId>) => Set<ProductId>) => {
      if (onSelectedIdsChange) {
        onSelectedIdsChange(updater(selectedIds));
      } else {
        setInternalSelectedIds(updater);
      }
    },
    [onSelectedIdsChange, selectedIds],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const publishingSet = useMemo(() => new Set(publishingIds ?? []), [publishingIds]);
  const deletingSet = useMemo(() => new Set(deletingIds ?? []), [deletingIds]);

  const pageRowIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const selectedOnPageCount = useMemo(
    () => pageRowIds.filter((id) => selectedIds.has(id)).length,
    [pageRowIds, selectedIds],
  );
  const allOnPageSelected = pageRowIds.length > 0 && selectedOnPageCount === pageRowIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setScrolled(node.scrollTop > 0);
  }, []);

  const handleToggleRow = useCallback(
    (id: ProductId, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [setSelectedIds],
  );

  const handleToggleAllOnPage = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pageRowIds) {
          if (checked) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [pageRowIds, setSelectedIds],
  );

  const handleClearSelection = useCallback(() => setSelectedIds(() => new Set()), [setSelectedIds]);

  const handleBulkAction = useCallback(
    (action: BulkAction) => {
      onBulkAction(action, [...selectedIds]);
    },
    [onBulkAction, selectedIds],
  );

  // Arrow-key roving navigation between rows within the table body.
  const handleBodyKeyDown = useCallback((event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('tr [role="checkbox"], tr button, tr a'),
    );
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), focusable.length - 1);
    focusable[nextIndex]?.focus();
  }, []);

  if (status === "loading") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <TableSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <ErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <EmptyState onUploadClick={onUploadClick} />
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <BulkToolbar
        selectedCount={selectedIds.size}
        onAction={handleBulkAction}
        onClear={handleClearSelection}
      />

      <div ref={scrollRef} onScroll={handleScroll} className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-sm">
          <thead
            className={cn(
              "sticky top-0 z-20 bg-slate-50",
              scrolled && "shadow-[0_1px_0_0_rgba(15,23,42,0.08),0_4px_8px_-4px_rgba(15,23,42,0.12)]",
            )}
          >
            <tr className="border-b border-line">
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 w-12 border-b border-line bg-slate-50 px-4 py-3 text-left"
              >
                <SelectionCheckbox
                  checked={allOnPageSelected}
                  indeterminate={someOnPageSelected}
                  onCheckedChange={handleToggleAllOnPage}
                  label="Select all products on this page"
                />
              </th>

              <th
                scope="col"
                className="sticky left-12 top-0 z-30 border-b border-line bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                Image
              </th>

              <th
                scope="col"
                className="sticky left-[6.5rem] top-0 z-30 border-b border-r border-line bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                SKU
              </th>

              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Product
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Price
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-faint">
                GD
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-faint">
                RGD
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-faint">
                MB
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Finish
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                AI Confidence
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                OCR Quality
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Status
              </th>
              <th
                scope="col"
                className="sticky right-0 top-0 z-30 border-b border-l border-line bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody onKeyDown={handleBodyKeyDown}>
            {rows.map((product) => (
              <ReviewRow
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                isPublishing={publishingSet.has(product.id)}
                isDeleting={deletingSet.has(product.id)}
                onToggleSelect={handleToggleRow}
                onReview={onReview}
                onEdit={onEdit}
                onPublish={onPublish}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        selectedCount={selectedIds.size}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}