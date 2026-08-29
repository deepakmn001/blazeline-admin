// src/components/delivery/DeliveryManagementPage.tsx
//
// Delivery Management Console — ONE self-contained module by explicit
// requirement. Everything (Overview / Zones / Pincodes / Rules / Rule
// Builder / Quote Simulator) lives in this file as internal, unexported
// local components, organized into clearly labeled sections below.
//
// Companion file: src/lib/deliveryApi.ts — all types + all API calls.
//
// HARD RULES followed throughout this file:
//   - No delivery pricing is ever calculated here. The Quote Simulator
//     calls the real backend (POST /delivery/quote/) and only renders
//     what it returns.
//   - No fabricated analytics, endpoints, or default rules (e.g. no
//     hidden ₹99 default — a zero-rule state is valid and is shown
//     as an explicit empty state).
//   - Every data-driven section has loading / empty / error states.
//   - Destructive actions (delete) always confirm first.
//   - Backend DecimalField values arrive as strings (e.g. "199.00") and
//     are only ever parsed for *display formatting*, never for business
//     math — the backend remains the source of truth for pricing.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MapPinOff,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";

import {
  zonesApi,
  pincodesApi,
  rulesApi,
  pickersApi,
  getDeliveryOverview,
  simulateDeliveryQuote,
  parseApiError,
  type DeliveryZone,
  type DeliveryZonePayload,
  type ServiceablePincode,
  type ServiceablePincodePayload,
  type DeliveryRule,
  type DeliveryRuleListItem,
  type DeliveryRuleCreatePayload,
  type DeliveryRuleUpdatePayload,
  type ConditionField,
  type ConditionOperator,
  type ActionType,
  type PricingMode,
  type CombineMode,
  type DeliveryOverview,
  type DeliveryQuoteItem,
  type DeliveryQuoteResponse,
  type PickerOption,
  type ApiFieldErrors,
} from "@/lib/deliveryApi";

/* ======================================================================
   SECTION: CONSTANTS
====================================================================== */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "zones", label: "Zones" },
  { key: "pincodes", label: "Pincodes" },
  { key: "rules", label: "Rules" },
  { key: "simulator", label: "Quote Simulator" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CONDITION_FIELD_OPTIONS: { value: ConditionField; label: string; numeric: boolean }[] = [
  { value: "cart_value", label: "Cart Value", numeric: true },
  { value: "weight", label: "Total Weight (kg)", numeric: true },
  { value: "quantity", label: "Item Quantity", numeric: true },
  { value: "total_quantity", label: "Total Cart Quantity", numeric: true },
  { value: "customer_type", label: "Customer Type", numeric: false },
  { value: "shipping_type", label: "Shipping Type", numeric: false },
];

const CONDITION_OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal to" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal to" },
  { value: "eq", label: "equal to" },
  { value: "in", label: "in (comma-separated)" },
];

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "base_charge", label: "Base Charge" },
  { value: "surcharge", label: "Surcharge" },
  { value: "discount", label: "Discount" },
  { value: "free_delivery", label: "Free Delivery" },
];

const PRICING_MODE_OPTIONS: { value: PricingMode; label: string }[] = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "per_item", label: "Per Item" },
  { value: "per_unit", label: "Per Unit" },
  { value: "per_kg", label: "Per Kg" },
  { value: "percentage", label: "Percentage (of scope subtotal)" },
];

const SCOPE_OPTIONS = [
  { value: "global", label: "Global", description: "Applies to every order." },
  { value: "zone", label: "Zone", description: "Applies within one delivery zone." },
  { value: "category", label: "Category", description: "Applies to one category." },
  { value: "subcategory", label: "Subcategory", description: "Applies to one subcategory." },
  { value: "product", label: "Product", description: "Applies to one product, any variant." },
  { value: "variant", label: "Variant", description: "Applies to one exact variant." },
] as const;

type ScopeType = (typeof SCOPE_OPTIONS)[number]["value"];

/* ======================================================================
   SECTION: HELPERS
====================================================================== */

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return DATE_FORMATTER.format(new Date(value));
  } catch {
    return "—";
  }
}

/**
 * Backend DecimalFields are serialized as strings (e.g. "199.00"), and may
 * be null. This ONLY formats for display — it never performs delivery or
 * business calculations, and it never assumes the value is numeric.
 * Malformed or empty strings degrade to "—" instead of throwing.
 */
function formatMoney(value: string | null): string {
  if (value === null || value === undefined) return "—";
  const trimmed = value.trim();
  if (trimmed === "") return "—";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "—";
  return CURRENCY.format(parsed);
}

/** Same safe-parse treatment for the (non-monetary) weight decimal string. */
function formatWeight(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "—";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return "—";
  return `${parsed} kg`;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/* ======================================================================
   SECTION: RULE BUILDER — INTERNAL FORM TYPES
   A local form shape lets the same UI drive both create and edit safely:
     - freshly-added condition/action rows never carry an `id`
     - rows loaded from an existing rule keep their `id`
   On submit we branch into the strict DeliveryRuleCreatePayload (no ids
   anywhere) or DeliveryRuleUpdatePayload (ids kept where present) — never
   a shared permissive shape, and never an unsafe cast.
====================================================================== */

interface RuleFormCondition {
  id?: number;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  sort_order: number;
}

interface RuleFormAction {
  id?: number;
  action_type: ActionType;
  pricing_mode: PricingMode;
  /** Kept as a string end-to-end — this is the API's decimal contract. */
  amount: string;
  label: string;
  metadata: Record<string, unknown>;
  sort_order: number;
  active: boolean;
}

interface RuleFormState {
  name: string;
  code: string;
  active: boolean;
  priority: number;
  zone_id: number | null;
  category_id: number | null;
  subcategory_id: number | null;
  product_id: number | null;
  variant_id: number | null;
  combine_mode: CombineMode;
  stop_after: boolean;
  starts_at: string | null;
  ends_at: string | null;
  conditions: RuleFormCondition[];
  actions: RuleFormAction[];
}

const EMPTY_RULE_FORM: RuleFormState = {
  name: "", code: "", active: true, priority: 0,
  zone_id: null, category_id: null, subcategory_id: null, product_id: null, variant_id: null,
  combine_mode: "add", stop_after: false, starts_at: null, ends_at: null,
  conditions: [], actions: [],
};

function ruleToFormState(rule: DeliveryRule): RuleFormState {
  return {
    name: rule.name,
    code: rule.code,
    active: rule.active,
    priority: rule.priority,
    zone_id: rule.zone?.id ?? null,
    category_id: rule.category?.id ?? null,
    subcategory_id: rule.subcategory?.id ?? null,
    product_id: rule.product?.id ?? null,
    variant_id: rule.variant?.id ?? null,
    combine_mode: rule.combine_mode,
    stop_after: rule.stop_after,
    starts_at: rule.starts_at,
    ends_at: rule.ends_at,
    conditions: rule.conditions.map((c) => ({
      id: c.id, field: c.field, operator: c.operator, value: c.value, sort_order: c.sort_order,
    })),
    actions: rule.actions.map((a) => ({
      id: a.id, action_type: a.action_type, pricing_mode: a.pricing_mode, amount: a.amount,
      label: a.label, metadata: a.metadata, sort_order: a.sort_order, active: a.active,
    })),
  };
}

function scopeOfForm(f: RuleFormState): ScopeType {
  if (f.variant_id) return "variant";
  if (f.product_id) return "product";
  if (f.subcategory_id) return "subcategory";
  if (f.category_id) return "category";
  if (f.zone_id) return "zone";
  return "global";
}

/** Pure, side-effect-free — directly unit testable (rule summary generator). */
function generateRuleSummary(
  form: RuleFormState,
  names: { zone?: string; category?: string; subcategory?: string; product?: string; variant?: string }
): { conditionText: string | null; actionSentences: string[]; combineText: string; stopText: string } {
  const conditionText =
    form.conditions.length === 0
      ? null
      : form.conditions
          .map((c) => {
            const field = CONDITION_FIELD_OPTIONS.find((f) => f.value === c.field)?.label ?? c.field;
            const op = CONDITION_OPERATOR_OPTIONS.find((o) => o.value === c.operator)?.label ?? c.operator;
            const unit = c.field === "cart_value" ? "₹" : "";
            const suffix = c.field === "weight" ? " kg" : "";
            return `${field} ${op} ${unit}${c.value}${suffix}`;
          })
          .join(" and ");

  const scopeLabel = (() => {
    if (form.variant_id) return names.variant ?? "the selected variant";
    if (form.product_id) return names.product ?? "the selected product";
    if (form.subcategory_id) return names.subcategory ?? "the selected subcategory";
    if (form.category_id) return names.category ?? "the selected category";
    if (form.zone_id) return names.zone ?? "the selected zone";
    return "all orders";
  })();

  const actionSentences = form.actions
    .filter((a) => a.active)
    .map((a) => {
      if (a.action_type === "free_delivery") return `Free delivery for ${scopeLabel}.`;
      const amountText =
        a.pricing_mode === "percentage"
          ? `${a.amount}%`
          : a.pricing_mode === "fixed"
          ? formatMoney(a.amount)
          : `${formatMoney(a.amount)} ${PRICING_MODE_OPTIONS.find((m) => m.value === a.pricing_mode)?.label.toLowerCase()}`;
      const labelSuffix = a.label ? ` ("${a.label}")` : "";
      if (a.action_type === "discount") return `Deduct ${amountText} as a discount for ${scopeLabel}${labelSuffix}.`;
      if (a.action_type === "surcharge") return `Add ${amountText} as a surcharge for ${scopeLabel}${labelSuffix}.`;
      return `Charge ${amountText} for ${scopeLabel}${labelSuffix}.`;
    });

  const combineText =
    form.combine_mode === "override"
      ? "This replaces any delivery charge calculated so far."
      : "This adds on top of any delivery charge calculated so far.";

  const stopText = form.stop_after
    ? "No further, more specific rules will be evaluated after this one."
    : "More specific rules may still apply after this one.";

  return { conditionText, actionSentences, combineText, stopText };
}

/** Soft (non-blocking) warnings surfaced in the summary — backend still authoritative. */
function detectSoftWarnings(form: RuleFormState): string[] {
  const warnings: string[] = [];
  const activeActions = form.actions.filter((a) => a.active);
  const hasFree = activeActions.some((a) => a.action_type === "free_delivery");
  const hasOther = activeActions.some((a) => a.action_type !== "free_delivery");

  if (hasFree && hasOther) {
    warnings.push(
      "Free Delivery plus other active actions — Free Delivery is always terminal, so the other actions here will never apply."
    );
  }
  if (form.actions.length > 0 && activeActions.length === 0) {
    warnings.push("All actions are inactive. This rule will contribute ₹0 and won't consume stop_after.");
  }
  if (activeActions.some((a) => a.action_type === "discount") && form.combine_mode === "override") {
    warnings.push("Discount actions require combine_mode = Add. Change combine mode or remove the discount action.");
  }
  return warnings;
}

/* ======================================================================
   SECTION: DIALOG ACCESSIBILITY (shared by Modal / Drawer / ConfirmDialog)
   - Escape closes
   - focus moves into the dialog on open (to a given element, or the
     first focusable descendant)
   - focus returns to the triggering control on close
   - Tab is trapped within the dialog while open
   - background scroll/interaction is suppressed while open
====================================================================== */

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function useDialogA11y(
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const toFocus = initialFocusRef?.current ?? getFocusable(containerRef.current)[0] ?? containerRef.current;
    toFocus?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = getFocusable(containerRef.current);
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return containerRef;
}

/* ======================================================================
   SECTION: SMALL REUSABLE LOCAL COMPONENTS
====================================================================== */

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "default" | "warning" | "success" }) {
  const toneClass =
    tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "inactive" | "scheduled" | "expired" }) {
  const config = {
    active: { variant: "success" as const, dot: "bg-emerald-500", label: "Active" },
    inactive: { variant: "danger" as const, dot: "bg-neutral-400", label: "Inactive" },
    scheduled: { variant: "warning" as const, dot: "bg-amber-500", label: "Scheduled" },
    expired: { variant: "danger" as const, dot: "bg-neutral-400", label: "Expired" },
  }[status];

  return (
    <Badge variant={config.variant}>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
        {config.label}
      </span>
    </Badge>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-destructive">{messages.join(" ")}</p>;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof MapPinOff;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-neutral-300" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-faint">{description}</p>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{message}</p>
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
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-line last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4 first:px-6">
              <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-100" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** Generic confirmation dialog for every destructive action in this module. */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  isConfirming = false,
  danger = true,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => {
    if (!isConfirming) onCancel();
  }, [isConfirming, onCancel]);
  const containerRef = useDialogA11y(open, handleClose, confirmRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40" onClick={handleClose} aria-hidden="true" />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-destructive/10" : "bg-amber-100"}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? "text-destructive" : "text-amber-600"}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 text-sm text-ink-faint">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={handleClose} disabled={isConfirming} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${danger ? "bg-destructive hover:bg-destructive/90" : "bg-ink hover:bg-ink/90"}`}
          >
            {isConfirming ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Generic modal shell — used for the Zone/Pincode forms. */
function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const containerRef = useDialogA11y(open, onClose);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-line bg-white p-6 shadow-xl outline-none`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-faint hover:bg-neutral-100 hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Full-screen side drawer — used for the Rule Builder. */
function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const containerRef = useDialogA11y(open, onClose);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-line bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="drawer-title" className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-faint hover:bg-neutral-100 hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

/** Debounced server-side searchable combobox — used by scope pickers. */
function EntityPicker({
  label,
  placeholder,
  value,
  valueLabel,
  onSelect,
  onClear,
  search,
}: {
  label: string;
  placeholder: string;
  value: number | null;
  valueLabel?: string;
  onSelect: (opt: PickerOption) => void;
  onClear: () => void;
  search: (query: string) => Promise<PickerOption[]>;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await search(query);
        if (id === reqId.current) setOptions(res);
      } catch (e) {
        console.error(e);
        if (id === reqId.current) {
          setOptions([]);
          setError("Couldn't load results. Try again.");
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, search]);

  if (value && valueLabel) {
    return (
      <div>
        <label className="block text-sm font-medium text-ink">{label}</label>
        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-line bg-neutral-50 px-3 py-2.5">
          <span className="text-sm font-medium text-ink">{valueLabel}</span>
          <button type="button" onClick={onClear} className="rounded-full p-1 text-ink-faint hover:bg-neutral-200 hover:text-ink" aria-label={`Clear ${label}`}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-line py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-3 text-sm text-ink-faint">Searching…</div>
          ) : error ? (
            <div className="px-3 py-3 text-sm text-destructive">{error}</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-ink-faint">No results.</div>
          ) : (
            options.map((opt) => (
              <button key={opt.id} type="button" onMouseDown={() => onSelect(opt)} className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-neutral-50">
                <span className="text-sm font-medium text-ink">{opt.label}</span>
                {opt.sublabel && <span className="text-xs text-ink-faint">{opt.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   SECTION: OVERVIEW PANEL
====================================================================== */

function OverviewPanel({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const [data, setData] = useState<DeliveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDeliveryOverview());
    } catch (err) {
      console.error(err);
      setError("Couldn't load the delivery overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (error || !data) return <ErrorState message={error ?? "No data."} onRetry={load} />;

  const totalRuleActivity = data.rules.total;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Zones" value={data.zones.active} tone="success" />
        <StatCard label="Inactive Zones" value={data.zones.inactive} />
        <StatCard label="Serviceable Pincodes" value={data.pincodes.serviceable} />
        <StatCard label="Active Rules" value={data.rules.active} tone="success" />
        <StatCard label="Scheduled Rules" value={data.rules.scheduled} tone="warning" />
        <StatCard label="Free Delivery Rules" value={data.rules.free_delivery} />
      </div>

      {totalRuleActivity === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Delivery pricing is not configured yet."
          description="Delivery availability is active, but no delivery pricing rules are currently configured. Create your first rule to start charging for delivery."
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => onNavigate("rules")} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">
                Create First Rule
              </button>
              <button type="button" onClick={() => onNavigate("zones")} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50">
                Manage Zones
              </button>
              <button type="button" onClick={() => onNavigate("simulator")} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50">
                Open Quote Simulator
              </button>
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Recently updated rules</h3>
          <ul className="mt-3 divide-y divide-line">
            {data.recent_changes.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink">{r.name}</span>
                <span className="flex items-center gap-3">
                  <StatusPill status={r.active ? "active" : "inactive"} />
                  <span className="text-xs text-ink-faint">{formatDate(r.updated_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   SECTION: ZONES PANEL
====================================================================== */

function ZoneFormModal({ open, zone, onClose, onSaved }: { open: boolean; zone: DeliveryZone | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = zone !== null;
  const [form, setForm] = useState<DeliveryZonePayload>({ name: "", code: "", active: true, priority: 0 });
  const [codeTouched, setCodeTouched] = useState(false);
  const [errors, setErrors] = useState<ApiFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(zone ? { name: zone.name, code: zone.code, active: zone.active, priority: zone.priority } : { name: "", code: "", active: true, priority: 0 });
    setCodeTouched(isEdit);
    setErrors({});
    setFormError(null);
  }, [open, zone, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      if (isEdit && zone) {
        await zonesApi.update(zone.id, form);
        toast.success(`"${form.name}" updated`);
      } else {
        await zonesApi.create(form);
        toast.success(`"${form.name}" created`);
      }
      onSaved();
    } catch (err) {
      const { fields, formMessage } = parseApiError(err);
      setErrors(fields);
      setFormError(formMessage);
      if (!formMessage && Object.keys(fields).length === 0) toast.error("Couldn't save the zone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? "Edit Zone" : "New Delivery Zone"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{formError}</div>}

        <div>
          <label className="block text-sm font-medium text-ink">Name</label>
          <input
            type="text" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, code: codeTouched ? f.code : slugify(e.target.value) }))}
            placeholder="e.g. Kolkata Core"
            className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <FieldError messages={errors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Code</label>
          <input
            type="text" required value={form.code}
            onChange={(e) => { setCodeTouched(true); setForm((f) => ({ ...f, code: slugify(e.target.value) })); }}
            placeholder="kolkata-core"
            className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <FieldError messages={errors.code} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Priority</label>
          <input
            type="number" min={0} value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <FieldError messages={errors.priority} />
        </div>

        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-line text-ink focus:ring-ink/20" />
          <span className="text-sm font-medium text-ink">Active</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create zone"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ZonesPanel() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeliveryZone | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasLoadedOnce = useRef(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    if (hasLoadedOnce.current) setRefreshing(true);
    setError(null);
    try {
      const res = await zonesApi.list({ search: debouncedSearch || undefined, active: activeFilter === "" ? undefined : activeFilter === "true" });
      if (id !== reqId.current) return;
      setZones(res.items);
    } catch (err) {
      if (id !== reqId.current) return;
      console.error(err);
      setError("Couldn't load delivery zones.");
    } finally {
      if (id === reqId.current) {
        hasLoadedOnce.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, activeFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(zone: DeliveryZone) {
    const prev = zones;
    setZones((zs) => zs.map((z) => (z.id === zone.id ? { ...z, active: !z.active } : z)));
    try {
      await zonesApi.toggleActive(zone.id);
      toast.success(zone.active ? `"${zone.name}" deactivated` : `"${zone.name}" activated`);
    } catch (err) {
      console.error(err);
      setZones(prev);
      toast.error(`Couldn't update "${zone.name}".`);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    try {
      await zonesApi.remove(target.id);
      setZones((zs) => zs.filter((z) => z.id !== target.id));
      toast.success(`"${target.name}" deleted`);
      setPendingDelete(null);
    } catch (err) {
      const { formMessage } = parseApiError(err);
      toast.error(formMessage || `Couldn't delete "${target.name}". It may still be referenced by pincodes or rules.`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">Geographic zones used to target delivery rules.</p>
        <button type="button" onClick={() => { setEditingZone(null); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/90">
          <Plus className="h-4 w-4" aria-hidden="true" /> New Zone
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search zones..." className="w-full rounded-xl border border-line py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
        </div>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className={refreshing ? "pointer-events-none opacity-50" : ""}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead className="bg-neutral-50">
                <tr>
                  {["Zone", "Status", "Priority", "Pincodes", "Rules", "Updated", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-4 text-xs font-semibold uppercase tracking-wide text-ink-faint first:px-6 ${i === 6 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : error ? (
                <tbody><tr><td colSpan={7}><ErrorState message={error} onRetry={load} /></td></tr></tbody>
              ) : zones.length === 0 ? (
                <tbody><tr><td colSpan={7}><EmptyState icon={MapPinOff} title="No delivery zones yet" description="Create a zone to start targeting delivery rules by geography." /></td></tr></tbody>
              ) : (
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} className="border-b border-line last:border-b-0 hover:bg-neutral-50/80">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-ink">{zone.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{zone.code}</div>
                      </td>
                      <td className="px-4 py-4"><StatusPill status={zone.active ? "active" : "inactive"} /></td>
                      <td className="px-4 py-4 text-sm text-ink-faint">{zone.priority}</td>
                      <td className="px-4 py-4 text-sm text-ink">{zone.pincode_count}</td>
                      <td className="px-4 py-4 text-sm text-ink">{zone.rule_count}</td>
                      <td className="px-4 py-4 text-sm text-ink-faint">{formatDate(zone.updated_at)}</td>
                      <td className="px-4 py-4">
                        <div className="relative flex justify-end">
                          <button type="button" onClick={() => setMenuOpenId(menuOpenId === zone.id ? null : zone.id)} className="rounded-lg p-2 text-ink-faint hover:bg-neutral-100 hover:text-ink" aria-label={`Actions for ${zone.name}`}>
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </button>
                          {menuOpenId === zone.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} aria-hidden="true" />
                              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-white py-1 shadow-lg">
                                <button type="button" onClick={() => { setMenuOpenId(null); setEditingZone(zone); setFormOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit zone</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); handleToggleActive(zone); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Power className="h-3.5 w-3.5" aria-hidden="true" /> {zone.active ? "Deactivate" : "Activate"}</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); setPendingDelete(zone); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete zone</button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
        {refreshing && (
          <div className="absolute inset-0 flex items-start justify-center pt-8">
            <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-medium text-ink-faint shadow-sm"><RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Updating…</div>
          </div>
        )}
      </div>

      <ZoneFormModal open={formOpen} zone={editingZone} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete delivery zone?"
        description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted. This cannot be undone.` : ""}
        confirmLabel="Delete zone"
        isConfirming={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/* ======================================================================
   SECTION: PINCODES PANEL
====================================================================== */

function PincodeFormModal({ open, pincode, onClose, onSaved }: { open: boolean; pincode: ServiceablePincode | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = pincode !== null;
  const [form, setForm] = useState<ServiceablePincodePayload>({ pincode: "", area_name: "", city: "Kolkata", state: "West Bengal", is_active: true, zone_id: null });
  const [zoneLabel, setZoneLabel] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<ApiFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(pincode ? { pincode: pincode.pincode, area_name: pincode.area_name, city: pincode.city, state: pincode.state, is_active: pincode.is_active, zone_id: pincode.zone?.id ?? null } : { pincode: "", area_name: "", city: "Kolkata", state: "West Bengal", is_active: true, zone_id: null });
    setZoneLabel(pincode?.zone?.name);
    setErrors({});
    setFormError(null);
  }, [open, pincode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      if (isEdit && pincode) {
        await pincodesApi.update(pincode.id, form);
        toast.success(`"${form.pincode}" updated`);
      } else {
        await pincodesApi.create(form);
        toast.success(`"${form.pincode}" added`);
      }
      onSaved();
    } catch (err) {
      const { fields, formMessage } = parseApiError(err);
      setErrors(fields);
      setFormError(formMessage);
      if (!formMessage && Object.keys(fields).length === 0) toast.error("Couldn't save the pincode.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEdit ? "Edit Pincode" : "Add Serviceable Pincode"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{formError}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink">Pincode</label>
            <input type="text" required maxLength={6} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))} placeholder="700001" className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
            <FieldError messages={errors.pincode} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Area name</label>
            <input type="text" required value={form.area_name} onChange={(e) => setForm((f) => ({ ...f, area_name: e.target.value }))} placeholder="e.g. Park Street" className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
            <FieldError messages={errors.area_name} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink">City</label>
            <input type="text" required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">State</label>
            <input type="text" required value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
          </div>
        </div>

        <EntityPicker
          label="Zone (optional)"
          placeholder="Search zones..."
          value={form.zone_id ?? null}
          valueLabel={zoneLabel}
          onSelect={(opt) => { setForm((f) => ({ ...f, zone_id: opt.id })); setZoneLabel(opt.label); }}
          onClear={() => { setForm((f) => ({ ...f, zone_id: null })); setZoneLabel(undefined); }}
          search={zonesApi.search}
        />
        <FieldError messages={errors.zone_id} />

        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-line text-ink focus:ring-ink/20" />
          <span className="text-sm font-medium text-ink">Active</span>
        </label>

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save changes" : "Add pincode"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PincodesPanel() {
  const [pincodes, setPincodes] = useState<ServiceablePincode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceablePincode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceablePincode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const hasLoadedOnce = useRef(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    if (hasLoadedOnce.current) setRefreshing(true);
    setError(null);
    try {
      const res = await pincodesApi.list({ search: debouncedSearch || undefined, is_active: activeFilter === "" ? undefined : activeFilter === "true" });
      if (id !== reqId.current) return;
      setPincodes(res.items);
    } catch (err) {
      if (id !== reqId.current) return;
      console.error(err);
      setError("Couldn't load serviceable pincodes.");
    } finally {
      if (id === reqId.current) {
        hasLoadedOnce.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, activeFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(p: ServiceablePincode) {
    const prev = pincodes;
    setPincodes((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
    try {
      await pincodesApi.toggleActive(p.id);
      toast.success(p.is_active ? `${p.pincode} deactivated` : `${p.pincode} activated`);
    } catch (err) {
      console.error(err);
      setPincodes(prev);
      toast.error(`Couldn't update ${p.pincode}.`);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    try {
      await pincodesApi.remove(target.id);
      setPincodes((ps) => ps.filter((x) => x.id !== target.id));
      toast.success(`${target.pincode} deleted`);
      setPendingDelete(null);
    } catch (err) {
      const { formMessage } = parseApiError(err);
      toast.error(formMessage || `Couldn't delete ${target.pincode}.`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">Pincodes eligible for delivery, optionally mapped to a zone.</p>
        <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/90">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Pincode
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pincode or area..." className="w-full rounded-xl border border-line py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
        </div>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className={refreshing ? "pointer-events-none opacity-50" : ""}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead className="bg-neutral-50">
                <tr>
                  {["Pincode", "Area", "City", "Zone", "Status", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-4 text-xs font-semibold uppercase tracking-wide text-ink-faint first:px-6 ${i === 5 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              {loading ? (
                <SkeletonRows cols={6} />
              ) : error ? (
                <tbody><tr><td colSpan={6}><ErrorState message={error} onRetry={load} /></td></tr></tbody>
              ) : pincodes.length === 0 ? (
                <tbody><tr><td colSpan={6}><EmptyState icon={MapPinOff} title="No serviceable pincodes" description="Add pincodes to define where deliveries are available." /></td></tr></tbody>
              ) : (
                <tbody>
                  {pincodes.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-b-0 hover:bg-neutral-50/80">
                      <td className="px-6 py-4 font-mono text-sm text-ink">{p.pincode}</td>
                      <td className="px-4 py-4 text-sm text-ink">{p.area_name}</td>
                      <td className="px-4 py-4 text-sm text-ink-faint">{p.city}</td>
                      <td className="px-4 py-4 text-sm text-ink-faint">{p.zone?.name ?? "—"}</td>
                      <td className="px-4 py-4"><StatusPill status={p.is_active ? "active" : "inactive"} /></td>
                      <td className="px-4 py-4">
                        <div className="relative flex justify-end">
                          <button type="button" onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)} className="rounded-lg p-2 text-ink-faint hover:bg-neutral-100 hover:text-ink" aria-label={`Actions for ${p.pincode}`}>
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </button>
                          {menuOpenId === p.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} aria-hidden="true" />
                              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-line bg-white py-1 shadow-lg">
                                <button type="button" onClick={() => { setMenuOpenId(null); setEditing(p); setFormOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); handleToggleActive(p); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Power className="h-3.5 w-3.5" aria-hidden="true" /> {p.is_active ? "Deactivate" : "Activate"}</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); setPendingDelete(p); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      <PincodeFormModal open={formOpen} pincode={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this pincode?"
        description={pendingDelete ? `${pendingDelete.pincode} (${pendingDelete.area_name}) will no longer be serviceable.` : ""}
        confirmLabel="Delete pincode"
        isConfirming={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/* ======================================================================
   SECTION: RULE BUILDER DRAWER (used by RulesPanel)
====================================================================== */

function RuleBuilderDrawer({ open, rule, onClose, onSaved }: { open: boolean; rule: DeliveryRule | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = rule !== null;

  const [form, setForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [names, setNames] = useState<{ zone?: string; category?: string; subcategory?: string; product?: string; variant?: string }>({});
  const [scopeChoice, setScopeChoice] = useState<ScopeType>("global");
  const [subcategoryCategoryFilter, setSubcategoryCategoryFilter] = useState<{ id: number; label: string } | null>(null);
  const [errors, setErrors] = useState<ApiFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<"basic" | "target" | "conditions" | "actions" | "summary">("basic");

  useEffect(() => {
    if (!open) return;
    const f = rule ? ruleToFormState(rule) : EMPTY_RULE_FORM;
    setForm(f);
    setNames(rule ? { zone: rule.zone?.name, category: rule.category?.name, subcategory: rule.subcategory?.name, product: rule.product?.name, variant: rule.variant?.sku } : {});
    setScopeChoice(scopeOfForm(f));
    setSubcategoryCategoryFilter(null);
    setErrors({});
    setFormError(null);
    setSection("basic");
  }, [open, rule]);

  function patch(p: Partial<RuleFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function setScope(next: ScopeType) {
    patch({ zone_id: null, category_id: null, subcategory_id: null, product_id: null, variant_id: null });
    setNames({});
    setSubcategoryCategoryFilter(null);
    setScopeChoice(next);
  }

  function addCondition() {
    patch({ conditions: [...form.conditions, { field: "cart_value", operator: "gte", value: "", sort_order: form.conditions.length }] });
  }
  function updateCondition(i: number, p: Partial<RuleFormCondition>) {
    const next = form.conditions.slice();
    next[i] = { ...next[i], ...p };
    if (p.operator && p.operator !== form.conditions[i].operator) next[i].value = "";
    patch({ conditions: next });
  }
  function removeCondition(i: number) {
    patch({ conditions: form.conditions.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, sort_order: idx })) });
  }

  function addAction() {
    patch({
      actions: [
        ...form.actions,
        { action_type: "base_charge", pricing_mode: "fixed", amount: "0", label: "", metadata: {}, sort_order: form.actions.length, active: true },
      ],
    });
  }
  function updateAction(i: number, p: Partial<RuleFormAction>) {
    const next = form.actions.slice();
    next[i] = { ...next[i], ...p };
    patch({ actions: next });
  }
  function removeAction(i: number) {
    patch({ actions: form.actions.filter((_, idx) => idx !== i).map((a, idx) => ({ ...a, sort_order: idx })) });
  }

  // Search callbacks are defined unconditionally at the top level (Rules of
  // Hooks) even though the pickers that use them only render conditionally.
  const subcategorySearch = useCallback(
    (q: string) => pickersApi.subcategories(q, subcategoryCategoryFilter?.id),
    [subcategoryCategoryFilter]
  );
  const variantSearch = useCallback((q: string) => pickersApi.variants(q), []);

  async function handleSave() {
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      if (isEdit && rule) {
        const payload: DeliveryRuleUpdatePayload = {
          name: form.name,
          code: form.code,
          active: form.active,
          priority: form.priority,
          zone_id: form.zone_id,
          category_id: form.category_id,
          subcategory_id: form.subcategory_id,
          product_id: form.product_id,
          variant_id: form.variant_id,
          combine_mode: form.combine_mode,
          stop_after: form.stop_after,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          conditions: form.conditions.map((c) =>
            c.id !== undefined
              ? { id: c.id, field: c.field, operator: c.operator, value: c.value, sort_order: c.sort_order }
              : { field: c.field, operator: c.operator, value: c.value, sort_order: c.sort_order }
          ),
          actions: form.actions.map((a) =>
            a.id !== undefined
              ? { id: a.id, action_type: a.action_type, pricing_mode: a.pricing_mode, amount: a.amount, label: a.label, metadata: a.metadata, sort_order: a.sort_order, active: a.active }
              : { action_type: a.action_type, pricing_mode: a.pricing_mode, amount: a.amount, label: a.label, metadata: a.metadata, sort_order: a.sort_order, active: a.active }
          ),
        };
        await rulesApi.update(rule.id, payload);
        toast.success(`"${form.name}" updated`);
      } else {
        const payload: DeliveryRuleCreatePayload = {
          name: form.name,
          code: form.code,
          active: form.active,
          priority: form.priority,
          zone_id: form.zone_id,
          category_id: form.category_id,
          subcategory_id: form.subcategory_id,
          product_id: form.product_id,
          variant_id: form.variant_id,
          combine_mode: form.combine_mode,
          stop_after: form.stop_after,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          conditions: form.conditions.map((c) => ({ field: c.field, operator: c.operator, value: c.value, sort_order: c.sort_order })),
          actions: form.actions.map((a) => ({ action_type: a.action_type, pricing_mode: a.pricing_mode, amount: a.amount, label: a.label, metadata: a.metadata, sort_order: a.sort_order, active: a.active })),
        };
        await rulesApi.create(payload);
        toast.success(`"${form.name}" created`);
      }
      onSaved();
    } catch (err) {
      const { fields, formMessage } = parseApiError(err);
      setErrors(fields);
      setFormError(formMessage);
      if (fields.name || fields.code || fields.priority) setSection("basic");
      else if (fields.zone_id || fields.category_id || fields.subcategory_id || fields.product_id || fields.variant_id) setSection("target");
      else if (fields.conditions) setSection("conditions");
      else if (fields.actions) setSection("actions");
      if (!formMessage && Object.keys(fields).length === 0) toast.error("Couldn't save the rule.");
    } finally {
      setSaving(false);
    }
  }

  const { conditionText, actionSentences, combineText, stopText } = generateRuleSummary(form, names);
  const warnings = detectSoftWarnings(form);
  const sections = [
    { key: "basic", label: "Basic" },
    { key: "target", label: "Target" },
    { key: "conditions", label: "Conditions" },
    { key: "actions", label: "Actions" },
    { key: "summary", label: "Summary" },
  ] as const;

  return (
    <Drawer open={open} title={isEdit ? `Edit Rule — ${rule?.name}` : "New Delivery Rule"} onClose={onClose}>
      <div className="space-y-6">
        {formError && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{formError}</div>}

        {/* Section tabs (in-drawer, not a separate page) */}
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1">
          {sections.map((s) => (
            <button key={s.key} type="button" onClick={() => setSection(s.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${section === s.key ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* --- BASIC --- */}
        {section === "basic" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink">Rule name</label>
                <input type="text" value={form.name} onChange={(e) => patch({ name: e.target.value, code: form.code || slugify(e.target.value) })} placeholder="e.g. Heavy Item Surcharge" className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                <FieldError messages={errors.name} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Code</label>
                <input type="text" value={form.code} onChange={(e) => patch({ code: slugify(e.target.value) })} placeholder="heavy-item-surcharge" className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                <FieldError messages={errors.code} />
              </div>
            </div>

            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={form.active} onChange={(e) => patch({ active: e.target.checked })} className="h-4 w-4 rounded border-line text-ink focus:ring-ink/20" />
              <span className="text-sm font-medium text-ink">Active</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink">Priority</label>
                <input type="number" value={form.priority} onChange={(e) => patch({ priority: Number(e.target.value) })} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                <FieldError messages={errors.priority} />
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-faint"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Higher priority rules in the same specificity level are evaluated later and take precedence.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Combine mode</label>
                <select value={form.combine_mode} onChange={(e) => patch({ combine_mode: e.target.value as CombineMode })} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
                  <option value="add">Add</option>
                  <option value="override">Override</option>
                </select>
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-faint"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{form.combine_mode === "add" ? "Adds this rule's result to the running total." : "Discards the running total and restarts from this rule."}</p>
              </div>
            </div>

            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={form.stop_after} onChange={(e) => patch({ stop_after: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-line text-ink focus:ring-ink/20" />
              <span><span className="block text-sm font-medium text-ink">Stop after this rule</span><span className="mt-0.5 block text-xs text-ink-faint">Stops further rule evaluation after this rule applies.</span></span>
            </label>

            <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink">Start date (optional)</label>
                <input type="datetime-local" value={toDatetimeLocal(form.starts_at)} onChange={(e) => patch({ starts_at: fromDatetimeLocal(e.target.value) })} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">End date (optional)</label>
                <input type="datetime-local" value={toDatetimeLocal(form.ends_at)} onChange={(e) => patch({ ends_at: fromDatetimeLocal(e.target.value) })} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
              </div>
            </div>
          </div>
        )}

        {/* --- TARGET --- */}
        {section === "target" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SCOPE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setScope(opt.value)} className={`rounded-xl border p-3 text-left transition-colors ${scopeChoice === opt.value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/40"}`}>
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className={`mt-0.5 text-xs ${scopeChoice === opt.value ? "text-white/70" : "text-ink-faint"}`}>{opt.description}</div>
                </button>
              ))}
            </div>

            {scopeChoice === "zone" && (
              <EntityPicker label="Zone" placeholder="Search zones..." value={form.zone_id} valueLabel={names.zone} onSelect={(o) => { patch({ zone_id: o.id }); setNames((n) => ({ ...n, zone: o.label })); }} onClear={() => patch({ zone_id: null })} search={zonesApi.search} />
            )}
            {scopeChoice === "category" && (
              <EntityPicker label="Category" placeholder="Search categories..." value={form.category_id} valueLabel={names.category} onSelect={(o) => { patch({ category_id: o.id }); setNames((n) => ({ ...n, category: o.label })); }} onClear={() => patch({ category_id: null })} search={pickersApi.categories} />
            )}
            {scopeChoice === "subcategory" && (
              <div className="space-y-4">
                <EntityPicker
                  label="Category (optional — narrows the subcategory search below)"
                  placeholder="Search categories..."
                  value={subcategoryCategoryFilter?.id ?? null}
                  valueLabel={subcategoryCategoryFilter?.label}
                  onSelect={(o) => setSubcategoryCategoryFilter({ id: o.id, label: o.label })}
                  onClear={() => setSubcategoryCategoryFilter(null)}
                  search={pickersApi.categories}
                />
                <EntityPicker
                  label="Subcategory"
                  placeholder="Search subcategories..."
                  value={form.subcategory_id}
                  valueLabel={names.subcategory}
                  onSelect={(o) => { patch({ subcategory_id: o.id }); setNames((n) => ({ ...n, subcategory: o.label })); }}
                  onClear={() => patch({ subcategory_id: null })}
                  search={subcategorySearch}
                />
              </div>
            )}
            {scopeChoice === "product" && (
              <EntityPicker label="Product" placeholder="Search products..." value={form.product_id} valueLabel={names.product} onSelect={(o) => { patch({ product_id: o.id }); setNames((n) => ({ ...n, product: o.label })); }} onClear={() => patch({ product_id: null })} search={pickersApi.products} />
            )}
            {scopeChoice === "variant" && (
              <EntityPicker label="Variant" placeholder="Search by SKU..." value={form.variant_id} valueLabel={names.variant} onSelect={(o) => { patch({ variant_id: o.id }); setNames((n) => ({ ...n, variant: o.label })); }} onClear={() => patch({ variant_id: null })} search={variantSearch} />
            )}

            {(errors.category_id || errors.subcategory_id || errors.product_id || errors.variant_id || errors.zone_id) && (
              <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {[...(errors.category_id ?? []), ...(errors.subcategory_id ?? []), ...(errors.product_id ?? []), ...(errors.variant_id ?? []), ...(errors.zone_id ?? [])].join(" ")}
              </div>
            )}
          </div>
        )}

        {/* --- CONDITIONS --- */}
        {section === "conditions" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-faint">Optional. This rule only applies when every condition below is true.</p>
            {form.conditions.map((c, i) => {
              const meta = CONDITION_FIELD_OPTIONS.find((f) => f.value === c.field);
              const isIn = c.operator === "in";
              return (
                <div key={i} className="rounded-xl border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    <div>
                      <label className="block text-xs font-medium text-ink-faint">Field</label>
                      <select value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value as ConditionField })} className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
                        {CONDITION_FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-faint">Operator</label>
                      <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as ConditionOperator })} className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
                        {CONDITION_OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-faint">{isIn ? "Values (comma-separated)" : "Value"}</label>
                      <input type={meta?.numeric && !isIn ? "number" : "text"} value={c.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder={isIn ? "wholesale, retail" : meta?.numeric ? "5000" : "value"} className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                    </div>
                    <button type="button" onClick={() => removeCondition(i)} className="flex h-9 items-center justify-center rounded-lg border border-line px-3 text-destructive hover:bg-destructive/5" aria-label="Remove condition"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </div>
              );
            })}
            {errors.conditions && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errors.conditions.join(" ")}</div>}
            <button type="button" onClick={addCondition} className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-ink hover:border-ink/40 hover:bg-neutral-50"><Plus className="h-4 w-4" aria-hidden="true" /> Add condition</button>
            {form.conditions.length === 0 && <p className="text-xs text-ink-faint">No conditions — applies unconditionally within its scope.</p>}
          </div>
        )}

        {/* --- ACTIONS --- */}
        {section === "actions" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-faint">What this rule charges, discounts, or waives. No active actions = ₹0 contribution.</p>
            {form.actions.map((a, i) => {
              const isFree = a.action_type === "free_delivery";
              const isDiscount = a.action_type === "discount";
              const isPct = a.pricing_mode === "percentage";
              return (
                <div key={i} className={`rounded-xl border p-4 ${!a.active ? "border-line bg-neutral-50 opacity-70" : "border-line"}`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-ink-faint">Action type</label>
                      <select value={a.action_type} onChange={(e) => updateAction(i, { action_type: e.target.value as ActionType })} className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
                        {ACTION_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-faint">Label (optional)</label>
                      <input type="text" value={a.label} onChange={(e) => updateAction(i, { label: e.target.value })} placeholder="e.g. Heavy Shipment Fee" className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                    </div>
                  </div>

                  {isFree ? (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Free Delivery ignores pricing mode/amount — it zeroes the charge and stops all further rule evaluation, regardless of this rule&apos;s stop_after..</p>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-ink-faint">Pricing mode</label>
                        <select value={a.pricing_mode} onChange={(e) => updateAction(i, { pricing_mode: e.target.value as PricingMode })} className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
                          {PRICING_MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-faint">Amount {isPct ? "(%)" : "(₹)"}</label>
                        <input
                          type="number" min={0} step={isPct ? 0.5 : 1} value={a.amount}
                          onChange={(e) => updateAction(i, { amount: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                        />
                        {isPct && <p className="mt-1 text-xs text-ink-faint">e.g. 5 means 5% of scope subtotal.</p>}
                      </div>
                    </div>
                  )}

                  {isDiscount && <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Discount requires combine_mode = Add.</p>}

                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={a.active} onChange={(e) => updateAction(i, { active: e.target.checked })} className="h-4 w-4 rounded border-line text-ink focus:ring-ink/20" /><span className="text-sm text-ink">Active</span></label>
                    <button type="button" onClick={() => removeAction(i)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove</button>
                  </div>
                </div>
              );
            })}
            {errors.actions && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errors.actions.join(" ")}</div>}
            <button type="button" onClick={addAction} className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-medium text-ink hover:border-ink/40 hover:bg-neutral-50"><Plus className="h-4 w-4" aria-hidden="true" /> Add action</button>
            {form.actions.length === 0 && <p className="text-xs text-ink-faint">No actions yet — this rule currently contributes ₹0.</p>}
          </div>
        )}

        {/* --- SUMMARY --- */}
        {section === "summary" && (
          <div className="space-y-4">
            {warnings.map((w, i) => (
              <div key={i} role="alert" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{w}</div>
            ))}
            <div className="rounded-2xl border border-line bg-neutral-50 p-5">
              <dl className="space-y-4">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">When</dt><dd className="mt-1 text-sm text-ink">{conditionText ?? "Always (no conditions)"}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Target</dt><dd className="mt-1 text-sm text-ink">{scopeChoice === "global" ? "Global — all orders" : `${SCOPE_OPTIONS.find((s) => s.value === scopeChoice)?.label}: ${names[scopeChoice as keyof typeof names] ?? "—"}`}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Then</dt><dd className="mt-1 space-y-1 text-sm text-ink">{actionSentences.length === 0 ? <span className="italic text-ink-faint">No active actions — contributes ₹0.</span> : actionSentences.map((s, i) => <p key={i}>{s}</p>)}</dd></div>
                <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Combine</dt><dd className="mt-1 text-sm text-ink">{combineText}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Stop</dt><dd className="mt-1 text-sm text-ink">{stopText}</dd></div>
                </div>
              </dl>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-faint"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />This is only an explanation — the backend remains authoritative for actual pricing.</div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line pt-5">
          <button
            type="button"
            onClick={() => { const idx = sections.findIndex((s) => s.key === section); if (idx > 0) setSection(sections[idx - 1].key); }}
            disabled={section === "basic"}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-neutral-50 disabled:opacity-40"
          >
            Back
          </button>
          {section === "summary" ? (
            <button type="button" onClick={handleSave} disabled={saving || !form.name || !form.code} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create rule"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { const idx = sections.findIndex((s) => s.key === section); if (idx < sections.length - 1) setSection(sections[idx + 1].key); }}
              disabled={section === "basic" && (!form.name || !form.code)}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-40"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

/* ======================================================================
   SECTION: RULES PANEL
====================================================================== */

function RulesPanel() {
  const [rules, setRules] = useState<DeliveryRuleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "scheduled" | "expired" | "inactive">("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryRule | null>(null);
  const [loadingRuleId, setLoadingRuleId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeliveryRuleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasLoadedOnce = useRef(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    if (hasLoadedOnce.current) setRefreshing(true);
    setError(null);
    try {
      const res = await rulesApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined });
      if (id !== reqId.current) return;
      setRules(res.items);
    } catch (err) {
      if (id !== reqId.current) return;
      console.error(err);
      setError("Couldn't load delivery rules.");
    } finally {
      if (id === reqId.current) {
        hasLoadedOnce.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingRule(null);
    setDrawerOpen(true);
  }

  async function openEdit(item: DeliveryRuleListItem) {
    setLoadingRuleId(item.id);
    try {
      const full = await rulesApi.get(item.id);
      setEditingRule(full);
      setDrawerOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't load this rule for editing.");
    } finally {
      setLoadingRuleId(null);
    }
  }

  async function handleToggleActive(item: DeliveryRuleListItem) {
    const prev = rules;
    setRules((rs) => rs.map((r) => (r.id === item.id ? { ...r, active: !r.active } : r)));
    try {
      await rulesApi.toggleActive(item.id);
      toast.success(item.active ? `"${item.name}" deactivated` : `"${item.name}" activated`);
      load();
    } catch (err) {
      console.error(err);
      setRules(prev);
      toast.error(`Couldn't update "${item.name}".`);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const target = pendingDelete;
    try {
      await rulesApi.remove(target.id);
      setRules((rs) => rs.filter((r) => r.id !== target.id));
      toast.success(`"${target.name}" deleted`);
      setPendingDelete(null);
    } catch (err) {
      const { formMessage } = parseApiError(err);
      toast.error(formMessage || `Couldn't delete "${target.name}".`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">Rules that determine delivery pricing, evaluated broadest to most specific.</p>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink/90">
          <Plus className="h-4 w-4" aria-hidden="true" /> New Rule
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules..." className="w-full rounded-xl border border-line py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className={refreshing ? "pointer-events-none opacity-50" : ""}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead className="bg-neutral-50">
                <tr>
                  {["Rule", "Status", "Target", "Priority", "Combine", "Stop", "Validity", "Cond.", "Act.", "Updated", ""].map((h, i) => (
                    <th key={i} className={`px-3 py-4 text-xs font-semibold uppercase tracking-wide text-ink-faint first:px-6 ${i === 10 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              {loading ? (
                <SkeletonRows cols={11} />
              ) : error ? (
                <tbody><tr><td colSpan={11}><ErrorState message={error} onRetry={load} /></td></tr></tbody>
              ) : rules.length === 0 ? (
                <tbody><tr><td colSpan={11}><EmptyState icon={Sparkles} title="No delivery rules yet" description="Delivery pricing is not configured. Create your first rule to begin charging for delivery." action={<button type="button" onClick={openCreate} className="mt-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">Create First Rule</button>} /></td></tr></tbody>
              ) : (
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-neutral-50/80">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-ink">{r.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{r.code}</div>
                      </td>
                      <td className="px-3 py-4"><StatusPill status={r.computed_status} /></td>
                      <td className="px-3 py-4 text-sm text-ink">{r.scope.label}</td>
                      <td className="px-3 py-4 text-sm text-ink-faint">{r.priority}</td>
                      <td className="px-3 py-4 text-sm text-ink-faint capitalize">{r.combine_mode}</td>
                      <td className="px-3 py-4 text-sm text-ink-faint">{r.stop_after ? "Yes" : "No"}</td>
                      <td className="px-3 py-4 text-xs text-ink-faint">
                        {r.starts_at || r.ends_at ? `${formatDate(r.starts_at)} → ${formatDate(r.ends_at)}` : "Always"}
                      </td>
                      <td className="px-3 py-4 text-sm text-ink-faint">{r.condition_count}</td>
                      <td className="px-3 py-4 text-sm text-ink-faint">{r.action_count}</td>
                      <td className="px-3 py-4 text-sm text-ink-faint">{formatDate(r.updated_at)}</td>
                      <td className="px-3 py-4">
                        <div className="relative flex justify-end">
                          <button type="button" onClick={() => setMenuOpenId(menuOpenId === r.id ? null : r.id)} disabled={loadingRuleId === r.id} className="rounded-lg p-2 text-ink-faint hover:bg-neutral-100 hover:text-ink disabled:opacity-50" aria-label={`Actions for ${r.name}`}>
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </button>
                          {menuOpenId === r.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} aria-hidden="true" />
                              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-white py-1 shadow-lg">
                                <button type="button" onClick={() => { setMenuOpenId(null); openEdit(r); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit rule</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); handleToggleActive(r); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-neutral-50"><Power className="h-3.5 w-3.5" aria-hidden="true" /> {r.active ? "Deactivate" : "Activate"}</button>
                                <button type="button" onClick={() => { setMenuOpenId(null); setPendingDelete(r); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete rule</button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      <RuleBuilderDrawer open={drawerOpen} rule={editingRule} onClose={() => setDrawerOpen(false)} onSaved={() => { setDrawerOpen(false); load(); }} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this delivery rule?"
        description={pendingDelete ? `"${pendingDelete.name}" will be permanently deleted and will no longer affect delivery pricing. This cannot be undone.` : ""}
        confirmLabel="Delete rule"
        isConfirming={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/* ======================================================================
   SECTION: QUOTE SIMULATOR PANEL
====================================================================== */

function QuoteSimulatorPanel() {
  const [pincode, setPincode] = useState("");
  const [items, setItems] = useState<DeliveryQuoteItem[]>([{ variant_id: 0, quantity: 1 }]);
  const [variantLabels, setVariantLabels] = useState<Record<number, string>>({});
  const [result, setResult] = useState<DeliveryQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variantSearch = useMemo(() => (q: string) => pickersApi.variants(q), []);

  function updateItem(i: number, patch: Partial<DeliveryQuoteItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { variant_id: 0, quantity: 1 }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const validItems = items.filter((it) => it.variant_id > 0 && it.quantity > 0);
    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one item with a selected variant.");
      return;
    }

    setLoading(true);
    try {
      const res = await simulateDeliveryQuote({ pincode, items: validItems });
      setResult(res);
    } catch (err) {
      const { formMessage } = parseApiError(err);
      setError(formMessage || "Couldn't calculate a delivery quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Simulate a delivery quote</h3>
        <p className="mt-1 text-xs text-ink-faint">Calls the real production delivery engine — never calculated locally.</p>

        <form onSubmit={handleSimulate} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Pincode</label>
            <input type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="700001" className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Cart items</label>
            {items.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <EntityPicker
                  label=""
                  placeholder="Search by variant SKU..."
                  value={item.variant_id || null}
                  valueLabel={variantLabels[i]}
                  onSelect={(o) => { updateItem(i, { variant_id: o.id }); setVariantLabels((v) => ({ ...v, [i]: o.label })); }}
                  onClear={() => { updateItem(i, { variant_id: 0 }); setVariantLabels((v) => ({ ...v, [i]: "" })); }}
                  search={variantSearch}
                />
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="w-24 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10" />
                  <span className="text-xs text-ink-faint">quantity</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="ml-auto rounded-lg p-1.5 text-destructive hover:bg-destructive/5" aria-label="Remove item"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-medium text-ink hover:underline"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add item</button>
          </div>

          {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50">
            {loading ? "Calculating…" : "Calculate delivery quote"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Result</h3>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Calculated by backend</span>
        </div>

        {!result ? (
          <EmptyState icon={Sparkles} title="No quote yet" description="Fill in the form and calculate to see the real backend delivery quote." />
        ) : (
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-ink-faint">Deliverable</dt>
              <dd><StatusPill status={result.deliverable ? "active" : "inactive"} /></dd>
            </div>
            <div className="flex items-center justify-between"><dt className="text-sm text-ink-faint">Zone</dt><dd className="text-sm text-ink">{result.zone?.name ?? "—"}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-sm text-ink-faint">Subtotal</dt><dd className="text-sm text-ink">{formatMoney(result.subtotal)}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-sm text-ink-faint">Weight</dt><dd className="text-sm text-ink">{formatWeight(result.weight)}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-sm text-ink-faint">Delivery charge</dt><dd className="text-sm font-semibold text-ink">{result.free_delivery ? "Free" : formatMoney(result.delivery_charge)}</dd></div>
            <div className="border-t border-line pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Breakdown</dt>
              {result.breakdown.length === 0 ? (
                <p className="mt-1.5 text-sm italic text-ink-faint">No charges applied.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {result.breakdown.map((b, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-ink-faint">{b.label} <span className="text-xs">({b.rule})</span></span>
                      <span className="font-medium text-ink">{formatMoney(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="border-t border-line pt-3 text-sm text-ink-faint">{result.message}</p>
          </dl>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   SECTION: MAIN PAGE COMPONENT
====================================================================== */

export default function DeliveryManagementPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Delivery Management</h1>
          <p className="mt-1 text-sm text-ink-faint">Configure zones, pincodes, and pricing rules for the delivery engine.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink shadow-sm hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "bg-ink text-white" : "text-ink-faint hover:bg-neutral-100 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={`${tab}-${refreshKey}`}>
        {tab === "overview" && <OverviewPanel onNavigate={setTab} />}
        {tab === "zones" && <ZonesPanel />}
        {tab === "pincodes" && <PincodesPanel />}
        {tab === "rules" && <RulesPanel />}
        {tab === "simulator" && <QuoteSimulatorPanel />}
      </div>
    </div>
  );
}