"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  Laptop,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import api from "@/lib/api";
import ProductDetailDrawer, {
  type ProductAnalyticsDetail,
} from "@/components/analytics/product-detail-drawer";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProductInfo = {
  id?: number | string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

type ProductMetrics = {
  views?: number;
  unique_sessions?: number;
  unique_customers?: number;
  add_to_cart?: number;
  remove_from_cart?: number;
  quantity_added?: number;
  orders_created?: number;
};

type ProductConversion = {
  view_to_cart_percent?: number;
  cart_to_order_percent?: number;
  view_to_order_percent?: number;
};

type ProductAnalyticsRow = {
  product_id: number | string;
  product?: ProductInfo;
  metrics?: ProductMetrics;
  conversion?: ProductConversion;
};

type ProductAnalyticsSummary = {
  total_products?: number;
  total_views?: number;
  total_unique_sessions?: number;
  total_unique_customers?: number;
  total_add_to_cart?: number;
  total_remove_from_cart?: number;
  total_quantity_added?: number;
  total_orders_created?: number;
};

type ProductAnalyticsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  success: boolean;
  filters?: {
    start?: string;
    end?: string;
    days?: number;
    search?: string;
    ordering?: string;
  };
  summary?: ProductAnalyticsSummary;
  results?: ProductAnalyticsRow[];
};


type ActivityCustomer = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
};

type ActivityProduct = {
  id?: number | string;
  name?: string | null;
  brand?: string | null;
};

type ActivityVariant = {
  id?: number | string;
  sku?: string | null;
};

type ActivityOrder = {
  id?: number | string;
  order_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
};

type ActivitySession = {
  id?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  source?: string | null;
  landing_page?: string | null;
  last_path?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  is_active?: boolean;
};

type ActivityEvent = {
  id: string;
  event_name: string;
  occurred_at?: string | null;
  path?: string | null;
  customer?: ActivityCustomer | null;
  guest_id?: string | null;
  identity_type?: "customer" | "guest" | string;
  product?: ActivityProduct | null;
  variant?: ActivityVariant | null;
  category?: string | null;
  subcategory?: string | null;
  order?: ActivityOrder | null;
  session?: ActivitySession | null;
  metadata?: Record<string, unknown>;
};

type ActivitySummary = {
  total_events?: number;
  unique_sessions?: number;
  unique_customers?: number;
  authenticated_events?: number;
  guest_events?: number;
};

type ActivityResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  success: boolean;
  filters?: {
    start?: string;
    end?: string;
    days?: number;
    event?: string;
    search?: string;
    customer_id?: number | null;
    session_id?: string | null;
    ordering?: string;
  };
  summary?: ActivitySummary;
  event_breakdown?: Array<{
    event_name: string;
    count: number;
  }>;
  results?: ActivityEvent[];
};

type ActivityEventKey =
  | "page_viewed"
  | "product_viewed"
  | "search_performed"
  | "search_suggestion_selected"
  | "cart_viewed"
  | "cart_item_added"
  | "cart_item_updated"
  | "cart_item_removed"
  | "cart_updated"
  | "checkout_order_created"
  | "login_success"
  | "customer_registered";

const ACTIVITY_EVENT_OPTIONS = [
  { value: "", label: "All activity" },
  { value: "page_viewed", label: "Page viewed" },
  { value: "product_viewed", label: "Product viewed" },
  { value: "search_performed", label: "Search performed" },
  { value: "search_suggestion_selected", label: "Search suggestion" },
  { value: "cart_viewed", label: "Cart viewed" },
  { value: "cart_item_added", label: "Cart item added" },
  { value: "cart_item_updated", label: "Cart item updated" },
  { value: "cart_item_removed", label: "Cart item removed" },
  { value: "cart_updated", label: "Cart updated" },
  { value: "checkout_order_created", label: "Order created" },
  { value: "login_success", label: "Login success" },
  { value: "customer_registered", label: "Customer registered" },
] as const;

type SortKey =
  | "views"
  | "unique_sessions"
  | "unique_customers"
  | "add_to_cart"
  | "remove_from_cart"
  | "quantity_added"
  | "orders_created"
  | "view_to_cart_percent"
  | "cart_to_order_percent"
  | "view_to_order_percent";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PERIOD_OPTIONS = [
  {
    value: "7",
    label: "Last 7 days",
  },
  {
    value: "30",
    label: "Last 30 days",
  },
  {
    value: "90",
    label: "Last 90 days",
  },
];

const SORT_OPTIONS: Array<{
  value: SortKey;
  label: string;
}> = [
  {
    value: "orders_created",
    label: "Orders created",
  },
  {
    value: "views",
    label: "Views",
  },
  {
    value: "add_to_cart",
    label: "Add to cart",
  },
  {
    value: "view_to_cart_percent",
    label: "View → cart",
  },
  {
    value: "view_to_order_percent",
    label: "View → order",
  },
  {
    value: "unique_customers",
    label: "Unique customers",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatNumber(
  value: number | string | null | undefined
) {
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
}

function formatPercent(
  value: number | string | null | undefined
) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getMetric(
  row: ProductAnalyticsRow,
  key: keyof ProductMetrics
) {
  return Number(row.metrics?.[key] || 0);
}

function getConversion(
  row: ProductAnalyticsRow,
  key: keyof ProductConversion
) {
  return Number(row.conversion?.[key] || 0);
}

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                */
/* -------------------------------------------------------------------------- */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  emphasis = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  emphasis?: "default" | "primary" | "dark";
}) {
  const iconClass =
    emphasis === "primary"
      ? "bg-orange-50 text-orange-600"
      : emphasis === "dark"
        ? "bg-slate-950 text-white"
        : "bg-slate-100 text-slate-700";

  return (
    <div
      className={[
        "group rounded-2xl border bg-white p-5 shadow-sm",
        "transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        emphasis === "primary"
          ? "border-orange-200"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  value,
  helper,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {eyebrow}
          </p>

          <p className="text-xs text-slate-500">
            {title}
          </p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-base font-semibold leading-6 text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {helper}
      </p>
    </div>
  );
}


function activityLabel(eventName: string) {
  return eventName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function activityIcon(eventName: string) {
  switch (eventName) {
    case "product_viewed":
      return Eye;
    case "page_viewed":
      return Activity;
    case "search_performed":
    case "search_suggestion_selected":
      return Search;
    case "cart_viewed":
    case "cart_item_added":
    case "cart_item_updated":
    case "cart_item_removed":
    case "cart_updated":
      return ShoppingCart;
    case "checkout_order_created":
      return ClipboardList;
    case "login_success":
    case "customer_registered":
      return User;
    default:
      return Activity;
  }
}

function activityIconTone(eventName: string) {
  switch (eventName) {
    case "cart_item_added":
    case "customer_registered":
    case "login_success":
      return "bg-emerald-50 text-emerald-700";
    case "cart_item_removed":
      return "bg-rose-50 text-rose-700";
    case "checkout_order_created":
      return "bg-slate-950 text-white";
    case "search_performed":
    case "search_suggestion_selected":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-orange-50 text-orange-700";
  }
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const diff = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAbsoluteTime(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deviceIcon(device?: string | null) {
  const value = String(device || "").toLowerCase();

  if (value.includes("mobile") || value.includes("phone")) {
    return Smartphone;
  }

  if (value.includes("tablet")) {
    return Tablet;
  }

  return Laptop;
}

function ActivityDetailDrawer({
  event,
  onClose,
}: {
  event: ActivityEvent | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!event) return;

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [event, onClose]);

  if (!event) return null;

  const DeviceIcon = deviceIcon(event.session?.device);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Activity details"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  activityIconTone(event.event_name),
                ].join(" ")}
              >
                {(() => {
                  const Icon = activityIcon(event.event_name);
                  return <Icon className="h-4.5 w-4.5" />;
                })()}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-600">
                  Event details
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
                  {activityLabel(event.event_name)}
                </h2>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {formatAbsoluteTime(event.occurred_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-5">
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Identity
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {event.customer ? (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      {event.customer.name || "Authenticated customer"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.customer.email || "No email available"}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Customer ID #{event.customer.id}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      Guest visitor
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {event.guest_id || "Guest identity unavailable"}
                    </p>
                  </>
                )}
              </div>
            </section>

            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Context
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] text-slate-400">Page</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">
                    {event.path || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] text-slate-400">Category</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {event.category || "—"}
                  </p>
                </div>
              </div>
            </section>

            {event.product ? (
              <section>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Product
                </p>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {event.product.name || `Product #${event.product.id}`}
                  </p>

                  {event.product.brand ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {event.product.brand}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1">
                      ID #{event.product.id}
                    </span>

                    {event.variant?.sku ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1">
                        SKU {event.variant.sku}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {event.order ? (
              <section>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Order
                </p>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {event.order.order_number || `Order #${event.order.id}`}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {event.order.status ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                        Status: {event.order.status}
                      </span>
                    ) : null}

                    {event.order.payment_status ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                        Payment: {event.order.payment_status}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Session
              </p>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <DeviceIcon className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {event.session?.device || "Device unavailable"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[event.session?.browser, event.session?.os]
                        .filter(Boolean)
                        .join(" • ") || "Browser details unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <p className="text-slate-400">Source</p>
                    <p className="mt-1 break-all font-medium text-slate-800">
                      {event.session?.source ||
                        event.session?.utm_source ||
                        "Direct / unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Country</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {event.session?.country || "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">First seen</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {formatAbsoluteTime(event.session?.first_seen_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Last seen</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {formatAbsoluteTime(event.session?.last_seen_at)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Event metadata
              </p>

              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-[11px] leading-5 text-slate-200">
                {JSON.stringify(event.metadata || {}, null, 2)}
              </pre>
            </section>

            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Technical IDs
              </p>

              <div className="space-y-2 rounded-2xl border border-slate-200 p-4 text-xs">
                <div>
                  <span className="text-slate-400">Event ID: </span>
                  <span className="break-all font-mono text-slate-700">
                    {event.id}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400">Session ID: </span>
                  <span className="break-all font-mono text-slate-700">
                    {event.session?.id || "—"}
                  </span>
                </div>

                {event.session?.ip_address ? (
                  <div>
                    <span className="text-slate-400">IP: </span>
                    <span className="font-mono text-slate-700">
                      {event.session.ip_address}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

function SearchAnalyticsPanel() {
  const [days, setDays] = useState("30");
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const loadSearches = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      const currentRequestId = ++requestId.current;

      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("days", days);
        params.set("event", "search_performed");
        params.set("ordering", "-occurred_at");
        params.set("page", "1");
        params.set("page_size", "50");

        const response = await api.get<ActivityResponse>(
          `/analytics/activity/?${params.toString()}`
        );

        if (currentRequestId !== requestId.current) return;
        setData(response.data);
      } catch (err: unknown) {
        if (currentRequestId !== requestId.current) return;

        console.error("Search analytics request failed:", err);

        const responseError = err as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        };

        setError(
          responseError.response?.data?.detail ||
            responseError.response?.data?.message ||
            "Unable to load search analytics right now."
        );
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [days]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => loadSearches(), 200);
    return () => window.clearTimeout(timer);
  }, [loadSearches]);

  const events = data?.results ?? [];

  const searchRecords = useMemo(() => {
    return events
      .map((event) => {
        const metadata = event.metadata ?? {};
        const rawQuery = metadata.query;
        const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

        const rawResultCount = Number(metadata.resultCount);
        const resultCount = Number.isFinite(rawResultCount)
          ? Math.max(0, rawResultCount)
          : 0;

        const rawZeroResults = metadata.zeroResults;
        const zeroResults =
          typeof rawZeroResults === "boolean"
            ? rawZeroResults
            : resultCount === 0;

        return {
          event,
          query,
          normalizedQuery: query.toLowerCase(),
          resultCount,
          zeroResults,
        };
      })
      .filter((record) => record.query.length > 0);
  }, [events]);

  const filteredRecords = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) return searchRecords;
    return searchRecords.filter((record) =>
      record.normalizedQuery.includes(normalized)
    );
  }, [searchRecords, searchText]);

  const stats = useMemo(() => {
    const total = searchRecords.length;
    const zeroResults = searchRecords.filter((record) => record.zeroResults).length;
    const uniqueQueries = new Set(
      searchRecords.map((record) => record.normalizedQuery)
    ).size;
    const averageResults = total
      ? searchRecords.reduce((sum, record) => sum + record.resultCount, 0) / total
      : 0;

    return {
      total,
      zeroResults,
      uniqueQueries,
      averageResults,
      zeroRate: total ? (zeroResults / total) * 100 : 0,
    };
  }, [searchRecords]);

  const topQueries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        query: string;
        searches: number;
        zeroResults: number;
        totalResults: number;
      }
    >();

    for (const record of searchRecords) {
      const key = record.normalizedQuery;
      const existing = grouped.get(key);

      if (existing) {
        existing.searches += 1;
        existing.zeroResults += record.zeroResults ? 1 : 0;
        existing.totalResults += record.resultCount;
      } else {
        grouped.set(key, {
          query: record.query,
          searches: 1,
          zeroResults: record.zeroResults ? 1 : 0,
          totalResults: record.resultCount,
        });
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 8)
      .map((row) => ({
        ...row,
        zeroRate: row.searches ? (row.zeroResults / row.searches) * 100 : 0,
        averageResults: row.searches ? row.totalResults / row.searches : 0,
      }));
  }, [searchRecords]);

  const latestRecords = useMemo(() => {
    return [...filteredRecords]
      .sort(
        (a, b) =>
          new Date(b.event.occurred_at || 0).getTime() -
          new Date(a.event.occurred_at || 0).getTime()
      )
      .slice(0, 12);
  }, [filteredRecords]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
                  Customer intent
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Search analytics
                </h2>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Understand what customers are looking for, how often searches return useful results, and where search demand is concentrated.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              aria-label="Search analytics date window"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              type="button"
              onClick={() => loadSearches({ refresh: true })}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Searches loaded</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(stats.total)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Unique queries</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(stats.uniqueQueries)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Zero-result searches</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(stats.zeroResults)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{stats.zeroRate.toFixed(1)}% of loaded searches</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Avg. results</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{stats.averageResults.toFixed(1)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Products returned per search</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Find a specific search query..."
            aria-label="Filter search queries"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">Search analytics could not be loaded.</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => loadSearches({ refresh: true })}
            className="mt-2 text-sm font-semibold text-red-800 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Demand</p>
                  <h3 className="text-sm font-semibold text-slate-950">Top searches</h3>
                </div>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
            </div>

            {topQueries.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Search className="mx-auto h-5 w-5 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-950">No tracked search queries yet</p>
                <p className="mt-1 text-xs text-slate-500">Search events will appear here once customers submit searches.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topQueries.map((row) => (
                  <div key={row.query.toLowerCase()} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.query}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatNumber(row.searches)} searches · avg. {row.averageResults.toFixed(1)} results
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-950">{row.zeroRate.toFixed(1)}%</p>
                      <p className="text-[11px] text-slate-400">zero-result</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Latest</p>
                  <h3 className="text-sm font-semibold text-slate-950">Recent searches</h3>
                </div>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            {latestRecords.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Search className="mx-auto h-5 w-5 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-950">No matching searches</p>
                <p className="mt-1 text-xs text-slate-500">Clear the query filter or try a different time window.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {latestRecords.map((record) => (
                  <div key={record.event.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{record.query}</p>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          record.zeroResults ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {record.zeroResults ? "No results" : `${formatNumber(record.resultCount)} results`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>
                        {record.event.customer
                          ? record.event.customer.name ||
                            record.event.customer.email ||
                            `Customer #${record.event.customer.id}`
                          : "Guest visitor"}
                      </span>
                      <span>·</span>
                      <span>{formatRelativeTime(record.event.occurred_at)}</span>
                      <span>·</span>
                      <span>{record.event.path || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3">
        <p className="text-xs leading-5 text-slate-400">
          Search insights are derived from the latest tracked search events returned by the analytics activity API. This view loads up to 50 search events for the selected period.
        </p>
      </div>
    </section>
  );
}


function CartCheckoutPanel() {
  const [days, setDays] = useState("30");
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const requestId = useRef(0);

  const loadCartCheckout = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      const currentRequestId = ++requestId.current;

      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("days", days);
        params.set("ordering", "-occurred_at");
        params.set("page", "1");
        params.set("page_size", "50");

        const response = await api.get<ActivityResponse>(
          `/analytics/activity/?${params.toString()}`
        );

        if (currentRequestId !== requestId.current) return;
        setData(response.data);
      } catch (err: unknown) {
        if (currentRequestId !== requestId.current) return;

        console.error("Cart & checkout analytics request failed:", err);
        const responseError = err as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        };
        setError(
          responseError.response?.data?.detail ||
            responseError.response?.data?.message ||
            "Unable to load cart and checkout analytics right now."
        );
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [days]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => loadCartCheckout(), 200);
    return () => window.clearTimeout(timer);
  }, [loadCartCheckout]);

  const events = useMemo(
    () =>
      (data?.results ?? []).filter((event) =>
        [
          "cart_viewed",
          "cart_item_added",
          "cart_item_updated",
          "cart_item_removed",
          "cart_updated",
          "checkout_order_created",
        ].includes(event.event_name)
      ),
    [data]
  );

  const filteredEvents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return events;

    return events.filter((event) => {
      const haystack = [
        event.event_name,
        event.customer?.name,
        event.customer?.email,
        event.product?.name,
        event.order?.order_number,
        event.path,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [events, search]);

  const stats = useMemo(() => {
    const sessionIds = new Set<string>();
    const cartSessionIds = new Set<string>();
    const checkoutSessionIds = new Set<string>();
    let cartValueTotal = 0;
    let cartValueSamples = 0;

    const counts = {
      cartViewed: 0,
      added: 0,
      updated: 0,
      removed: 0,
      cartUpdated: 0,
      checkout: 0,
      quantityAdded: 0,
    };

    for (const event of events) {
      const sessionId = event.session?.id || event.id;
      sessionIds.add(sessionId);

      if (event.event_name.startsWith("cart_")) {
        cartSessionIds.add(sessionId);
      }
      if (event.event_name === "checkout_order_created") {
        checkoutSessionIds.add(sessionId);
      }

      switch (event.event_name) {
        case "cart_viewed":
          counts.cartViewed += 1;
          break;
        case "cart_item_added":
          counts.added += 1;
          break;
        case "cart_item_updated":
          counts.updated += 1;
          break;
        case "cart_item_removed":
          counts.removed += 1;
          break;
        case "cart_updated":
          counts.cartUpdated += 1;
          break;
        case "checkout_order_created":
          counts.checkout += 1;
          break;
      }

      const metadata = event.metadata ?? {};
      const rawQuantity = Number(metadata.total_quantity ?? metadata.quantity ?? 0);
      if (Number.isFinite(rawQuantity) && rawQuantity > 0) {
        counts.quantityAdded = Math.max(counts.quantityAdded, rawQuantity);
      }

      const rawCartValue = Number(metadata.cart_value);
      if (Number.isFinite(rawCartValue) && rawCartValue >= 0) {
        cartValueTotal += rawCartValue;
        cartValueSamples += 1;
      }
    }

    const potentialDropoffSessions = [...cartSessionIds].filter(
      (sessionId) => !checkoutSessionIds.has(sessionId)
    ).length;

    const cartToCheckoutRate = cartSessionIds.size
      ? (checkoutSessionIds.size / cartSessionIds.size) * 100
      : 0;

    return {
      ...counts,
      uniqueSessions: sessionIds.size,
      cartSessions: cartSessionIds.size,
      checkoutSessions: checkoutSessionIds.size,
      potentialDropoffSessions,
      cartToCheckoutRate,
      observedCartValue: cartValueSamples
        ? cartValueTotal / cartValueSamples
        : 0,
    };
  }, [events]);

  const recentCartEvents = filteredEvents.slice(0, 12);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <ShoppingCart className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Commerce intelligence
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Cart & checkout intelligence
                </h2>
              </div>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Understand cart intent, item changes and checkout signals from the tracked customer journey.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              type="button"
              onClick={() => loadCartCheckout({ refresh: true })}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-400">Loading cart and checkout intelligence…</div>
      ) : error ? (
        <div className="p-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {([
              { title: "Cart views", value: formatNumber(stats.cartViewed), helper: "cart_viewed", icon: ShoppingCart },
              { title: "Items added", value: formatNumber(stats.added), helper: "add-to-cart signals", icon: Package },
              { title: "Items removed", value: formatNumber(stats.removed), helper: "removal signals", icon: Trash2 },
              { title: "Checkouts created", value: formatNumber(stats.checkout), helper: "order-created events", icon: ClipboardList },
              { title: "Potential drop-off", value: formatNumber(stats.potentialDropoffSessions), helper: "cart sessions without checkout", icon: TrendingUp },
            ] satisfies Array<{
              title: string;
              value: string;
              helper: string;
              icon: LucideIcon;
            }>).map(({ title, value, helper, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">{title}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Cart-to-checkout funnel
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Session-level view across the loaded activity window.</p>
                  </div>
                  <div className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    {formatPercent(stats.cartToCheckoutRate)} session conversion
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {[
                  ["Cart sessions", stats.cartSessions, "Users showing cart intent"],
                  ["Checkout sessions", stats.checkoutSessions, "Sessions with order creation"],
                  ["Potential drop-off", stats.potentialDropoffSessions, "Cart sessions without a checkout event"],
                ].map(([label, value, helper], index) => {
                  const numericValue = Number(value);
                  const maxValue = Math.max(stats.cartSessions, 1);
                  const width = Math.min(100, (numericValue / maxValue) * 100);

                  return (
                    <div key={String(label)}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{label}</span>
                        <span className="font-semibold text-slate-950">{formatNumber(numericValue)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {index === 2 ? "Interpret as a signal, not confirmed abandonment." : helper}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <p className="text-sm font-semibold text-slate-950">Cart intent snapshot</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Latest tracked cart behaviour in this reporting window.</p>

              <div className="mt-5 space-y-4">
                {[
                  ["Add-to-cart", stats.added, "tracked adds"],
                  ["Update events", stats.updated + stats.cartUpdated, "quantity/cart changes"],
                  ["Remove events", stats.removed, "tracked removals"],
                  ["Avg observed cart value", `₹${Math.round(stats.observedCartValue).toLocaleString("en-IN")}`, "average captured cart value"],
                ].map(([label, value, helper]) => (
                  <div key={String(label)} className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{helper}</p>
                    </div>
                    <p className="text-lg font-semibold text-slate-950">{typeof value === "number" ? formatNumber(value) : value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Recent cart & checkout activity</p>
                <p className="mt-1 text-xs text-slate-400">Showing the latest matching events from the activity API.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customers, products, orders"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            {recentCartEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No cart or checkout events match this view.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCartEvents.map((event) => {
                  const metadata = event.metadata ?? {};
                  const cartValue = Number(metadata.cart_value);
                  const eventValue = Number.isFinite(cartValue) && cartValue > 0 ? `₹${Math.round(cartValue).toLocaleString("en-IN")}` : null;

                  return (
                    <div key={event.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={[
                              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                              event.event_name === "checkout_order_created" ? "bg-slate-950 text-white" : event.event_name === "cart_item_removed" ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-orange-700",
                            ].join(" ")}>
                              {activityLabel(event.event_name)}
                            </span>
                            <span className="text-xs text-slate-400">{formatRelativeTime(event.occurred_at)}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="font-semibold text-slate-900">
                              {event.customer?.name || event.customer?.email || (event.guest_id ? "Guest visitor" : "Unknown visitor")}
                            </span>
                            {event.product?.name ? <><span className="text-slate-300">·</span><span className="text-slate-500">{event.product.name}</span></> : null}
                            {event.order?.order_number ? <><span className="text-slate-300">·</span><span className="font-medium text-slate-700">{event.order.order_number}</span></> : null}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                            <span>{event.identity_type === "customer" ? "Authenticated" : "Guest"}</span>
                            <span>·</span>
                            <span>{event.session?.device || "Unknown device"} · {event.session?.browser || "Unknown browser"}</span>
                            {eventValue ? <><span>·</span><span>{eventValue}</span></> : null}
                          </div>
                        </div>

                        <div className="shrink-0 text-left lg:text-right">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Context</p>
                          <p className="mt-1 max-w-xs truncate text-xs font-medium text-slate-600 lg:max-w-[260px]">{event.path || "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
            <p>Potential drop-off is a reporting signal based on loaded cart sessions without a checkout event; it is not a confirmed abandoned-cart status. This panel uses the latest 50 activity events returned for the selected period.</p>
          </div>
        </div>
      )}
    </section>
  );
}


function LiveActivityPanel() {
  const [days, setDays] = useState("1");
  const [eventFilter, setEventFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(
    null
  );

  const requestId = useRef(0);

  const loadActivity = useCallback(
    async ({
      refresh = false,
      requestedPage = page,
    }: {
      refresh?: boolean;
      requestedPage?: number;
    } = {}) => {
      const currentRequestId = ++requestId.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("days", days);
        params.set("ordering", "-occurred_at");
        params.set("page", String(requestedPage));
        params.set("page_size", "50");

        if (eventFilter) {
          params.set("event", eventFilter);
        }

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await api.get<ActivityResponse>(
          `/analytics/activity/?${params.toString()}`
        );

        if (currentRequestId !== requestId.current) return;

        setData(response.data);
      } catch (err: unknown) {
        if (currentRequestId !== requestId.current) return;

        console.error("Live activity request failed:", err);

        const responseError = err as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        };

        setError(
          responseError.response?.data?.detail ||
            responseError.response?.data?.message ||
            "Unable to load live activity right now."
        );
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [days, eventFilter, page, search]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadActivity({ requestedPage: page });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadActivity, page]);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = window.setInterval(() => {
      loadActivity({ refresh: true, requestedPage: page });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [autoRefresh, loadActivity, page]);

  const results = data?.results || [];
  const summary = data?.summary;

  const hasPrevious = Boolean(data?.previous);
  const hasNext = Boolean(data?.next);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Activity className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
                  Real-time activity
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Live activity
                </h2>
              </div>
            </div>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Monitor the latest tracked customer and guest events without
              leaving the analytics workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((value) => !value)}
              className={[
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition",
                autoRefresh
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              aria-pressed={autoRefresh}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-300",
                ].join(" ")}
              />
              {autoRefresh ? "Live" : "Paused"}
            </button>

            <button
              type="button"
              onClick={() =>
                loadActivity({
                  refresh: true,
                  requestedPage: page,
                })
              }
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing ? "animate-spin" : "",
                ].join(" ")}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Events</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(summary?.total_events)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Sessions</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(summary?.unique_sessions)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Customers</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(summary?.unique_customers)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Authenticated</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(summary?.authenticated_events)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] text-slate-400">Guests</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(summary?.guest_events)}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search events, customers, products or orders..."
              aria-label="Search live activity"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <select
            value={eventFilter}
            onChange={(event) => {
              setPage(1);
              setEventFilter(event.target.value);
            }}
            aria-label="Filter activity by event"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            {ACTIVITY_EVENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={days}
            onChange={(event) => {
              setPage(1);
              setDays(event.target.value);
            }}
            aria-label="Activity date window"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-800">
            Activity could not be loaded.
          </p>

          <p className="mt-1 text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() =>
              loadActivity({
                refresh: true,
                requestedPage: page,
              })
            }
            className="mt-2 text-sm font-semibold text-red-800 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Activity className="h-5 w-5 text-slate-400" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-slate-950">
            No activity found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Try a different time window, event type or search term.
          </p>
        </div>
      ) : (
        <div>
          <div className="divide-y divide-slate-100">
            {results.map((event) => {
              const Icon = activityIcon(event.event_name);

              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="group block w-full px-5 py-4 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-200"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        activityIconTone(event.event_name),
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">
                          {activityLabel(event.event_name)}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            event.customer
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {event.customer ? "Customer" : "Guest"}
                        </span>
                      </div>

                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {event.customer ? (
                          <span className="max-w-[220px] truncate font-medium text-slate-700">
                            {event.customer.name ||
                              event.customer.email ||
                              `Customer #${event.customer.id}`}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-700">
                            Guest visitor
                          </span>
                        )}

                        {event.product?.name ? (
                          <>
                            <span>•</span>
                            <span className="max-w-[260px] truncate">
                              {event.product.name}
                            </span>
                          </>
                        ) : null}

                        {event.order?.order_number ? (
                          <>
                            <span>•</span>
                            <span>{event.order.order_number}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <span className="shrink-0">Page</span>
                          <span className="max-w-[360px] truncate text-slate-500">
                            {event.path || "—"}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {formatRelativeTime(event.occurred_at)}
                        </span>

                        <span>
                          {[event.session?.device, event.session?.browser]
                            .filter(Boolean)
                            .join(" • ") || "Device unknown"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-700">{page}</span>
              {" · "}
              <span className="font-semibold text-slate-700">
                {formatNumber(data?.count)}
              </span>{" "}
              events
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!hasPrevious || loading}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4 rotate-90" />
                Previous
              </button>

              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowUp className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ActivityDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */


function Customer360Panel() {
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [customerEvents, setCustomerEvents] = useState<ActivityEvent[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ActivityCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const requestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadCustomers = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      const currentRequestId = ++requestId.current;
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("days", days);
        params.set("ordering", "-occurred_at");
        params.set("page", "1");
        params.set("page_size", "50");
        if (search.trim()) params.set("search", search.trim());

        const response = await api.get<ActivityResponse>(
          `/analytics/activity/?${params.toString()}`
        );

        if (currentRequestId !== requestId.current) return;
        setActivity(response.data);

        if (selectedCustomer) {
          const selectedId = String(selectedCustomer.id ?? "");
          const stillPresent = (response.data.results ?? []).some(
            (event) => String(event.customer?.id ?? "") === selectedId
          );
          if (!stillPresent && search.trim()) {
            setSelectedCustomer(null);
            setCustomerEvents([]);
          }
        }
      } catch (err: unknown) {
        if (currentRequestId !== requestId.current) return;
        console.error("Customer 360 request failed:", err);
        const responseError = err as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        };
        setError(
          responseError.response?.data?.detail ||
            responseError.response?.data?.message ||
            "Unable to load customer intelligence right now."
        );
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [days, search, selectedCustomer]
  );

  const loadCustomerDetail = useCallback(async (customer: ActivityCustomer) => {
    const customerId = customer.id;
    if (customerId === undefined || customerId === null || String(customerId) === "") return;

    const currentRequestId = ++detailRequestId.current;
    setSelectedCustomer(customer);
    setCustomerEvents([]);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("days", days);
      params.set("customer_id", String(customerId));
      params.set("ordering", "-occurred_at");
      params.set("page", "1");
      params.set("page_size", "50");

      const response = await api.get<ActivityResponse>(
        `/analytics/activity/?${params.toString()}`
      );

      if (currentRequestId !== detailRequestId.current) return;
      setCustomerEvents(response.data.results ?? []);
    } catch (err: unknown) {
      if (currentRequestId !== detailRequestId.current) return;
      console.error("Customer 360 detail request failed:", err);
      const responseError = err as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
          };
        };
      };
      setDetailError(
        responseError.response?.data?.detail ||
          responseError.response?.data?.message ||
          "Unable to load this customer's activity."
      );
    } finally {
      if (currentRequestId === detailRequestId.current) {
        setDetailLoading(false);
      }
    }
  }, [days]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadCustomers(), 200);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const customerRows = useMemo(() => {
    const map = new Map<string, {
      customer: ActivityCustomer;
      sessions: Set<string>;
      events: ActivityEvent[];
      lastSeen: string | null;
      productViews: number;
      adds: number;
      checkouts: number;
      searches: number;
    }>();

    for (const event of activity?.results ?? []) {
      if (!event.customer?.id) continue;
      const key = String(event.customer.id);
      let row = map.get(key);
      if (!row) {
        row = {
          customer: event.customer,
          sessions: new Set<string>(),
          events: [],
          lastSeen: null,
          productViews: 0,
          adds: 0,
          checkouts: 0,
          searches: 0,
        };
        map.set(key, row);
      }

      row.events.push(event);
      if (event.session?.id) row.sessions.add(event.session.id);
      if (!row.lastSeen || String(event.occurred_at ?? "") > row.lastSeen) {
        row.lastSeen = event.occurred_at ?? null;
      }

      switch (event.event_name) {
        case "product_viewed":
          row.productViews += 1;
          break;
        case "cart_item_added":
          row.adds += 1;
          break;
        case "checkout_order_created":
          row.checkouts += 1;
          break;
        case "search_performed":
          row.searches += 1;
          break;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.lastSeen ?? 0).getTime();
      const bTime = new Date(b.lastSeen ?? 0).getTime();
      return bTime - aTime;
    });
  }, [activity]);

  const detailStats = useMemo(() => {
    const sessions = new Set<string>();
    const products = new Map<string, { name: string; views: number; adds: number }>();
    const orders = new Map<string, ActivityOrder>();
    const eventCounts = new Map<string, number>();
    let cartValueTotal = 0;
    let cartValueSamples = 0;

    let registrationEvent: ActivityEvent | null = null;
    let lastSeen: string | null = null;

    for (const event of customerEvents) {
      if (event.session?.id) sessions.add(event.session.id);
      if (!lastSeen || String(event.occurred_at ?? "") > lastSeen) {
        lastSeen = event.occurred_at ?? null;
      }

      eventCounts.set(
        event.event_name,
        (eventCounts.get(event.event_name) ?? 0) + 1
      );

      if (event.event_name === "customer_registered" && !registrationEvent) {
        registrationEvent = event;
      }

      if (event.order?.id || event.order?.order_number) {
        const key = String(event.order.id ?? event.order.order_number);
        orders.set(key, event.order);
      }

      if (event.product?.id || event.product?.name) {
        const key = String(event.product.id ?? event.product.name);
        const existing = products.get(key) ?? {
          name: event.product.name || "Unknown product",
          views: 0,
          adds: 0,
        };
        if (event.event_name === "product_viewed") existing.views += 1;
        if (event.event_name === "cart_item_added") existing.adds += 1;
        products.set(key, existing);
      }

      const rawCartValue = Number(event.metadata?.cart_value);
      if (Number.isFinite(rawCartValue) && rawCartValue >= 0) {
        cartValueTotal += rawCartValue;
        cartValueSamples += 1;
      }
    }

    return {
      sessionCount: sessions.size,
      eventCount: customerEvents.length,
      productViewCount: eventCounts.get("product_viewed") ?? 0,
      searchCount: eventCounts.get("search_performed") ?? 0,
      cartAddCount: eventCounts.get("cart_item_added") ?? 0,
      cartRemoveCount: eventCounts.get("cart_item_removed") ?? 0,
      checkoutCount: eventCounts.get("checkout_order_created") ?? 0,
      loginCount: eventCounts.get("login_success") ?? 0,
      registrationEvent,
      orders: Array.from(orders.values()),
      products: Array.from(products.values())
        .sort((a, b) => (b.views + b.adds) - (a.views + a.adds))
        .slice(0, 6),
      avgCartValue: cartValueSamples ? cartValueTotal / cartValueSamples : 0,
      lastSeen,
    };
  }, [customerEvents]);

  const topCustomers = customerRows.slice(0, 12);
  const totalCustomers = customerRows.length;
  const totalEvents = Number(activity?.summary?.total_events ?? 0);
  const totalSessions = Number(activity?.summary?.unique_sessions ?? 0);
  const authenticatedEvents = Number(activity?.summary?.authenticated_events ?? 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Customer intelligence
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Customer 360
                </h2>
              </div>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Explore the observed customer journey across sessions, products,
              searches, carts and checkout activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              type="button"
              onClick={() => loadCustomers({ refresh: true })}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={[
                "h-4 w-4",
                refreshing ? "animate-spin" : "",
              ].join(" ")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400">Customers represented</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatNumber(totalCustomers)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Observed in this activity window</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400">Tracked events</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatNumber(totalEvents)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Customer + guest events</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400">Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatNumber(totalSessions)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Unique tracked sessions</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
            <p className="text-[11px] text-orange-600">Authenticated activity</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatNumber(authenticatedEvents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Events tied to a signed-in customer</p>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="border-b border-slate-100 xl:border-b-0 xl:border-r">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Customer directory</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Customers visible in tracked activity.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {formatNumber(totalCustomers)}
              </span>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, email, product or order..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">Loading customers...</div>
            ) : error ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-rose-600">{error}</p>
                <button
                  type="button"
                  onClick={() => loadCustomers({ refresh: true })}
                  className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Try again
                </button>
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No customers found</p>
                <p className="mt-1 text-xs text-slate-400">Try a different search or time window.</p>
              </div>
            ) : (
              topCustomers.map((row) => {
                const isSelected = String(selectedCustomer?.id ?? "") === String(row.customer.id ?? "");
                return (
                  <button
                    key={String(row.customer.id)}
                    type="button"
                    onClick={() => loadCustomerDetail(row.customer)}
                    className={[
                      "w-full border-b border-slate-100 px-5 py-4 text-left transition sm:px-6",
                      isSelected ? "bg-orange-50/70" : "hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected ? "bg-white text-orange-600" : "bg-slate-100 text-slate-600",
                      ].join(" ")}>
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {row.customer.name || "Unnamed customer"}
                          </p>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {row.customer.email || `Customer #${row.customer.id}`}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span>{formatNumber(row.events.length)} events</span>
                          <span>{formatNumber(row.sessions.size)} sessions</span>
                          <span>{formatNumber(row.productViews)} product views</span>
                          <span>{formatNumber(row.adds)} adds</span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Last active {formatRelativeTime(row.lastSeen)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="min-w-0">
          {!selectedCustomer ? (
            <div className="flex min-h-[620px] items-center justify-center px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">Select a customer</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Open a customer to see the observed journey, commerce signals,
                  sessions, products and event timeline.
                </p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex min-h-[620px] items-center justify-center text-sm text-slate-400">
              Loading customer journey...
            </div>
          ) : detailError ? (
            <div className="flex min-h-[620px] items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-medium text-rose-600">{detailError}</p>
                <button
                  type="button"
                  onClick={() => loadCustomerDetail(selectedCustomer)}
                  className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <User className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-tight text-slate-950">
                        {selectedCustomer.name || "Unnamed customer"}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {selectedCustomer.email || "No email observed"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Customer ID #{selectedCustomer.id}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Authenticated profile
                  </span>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] text-slate-400">Sessions</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(detailStats.sessionCount)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] text-slate-400">Product views</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(detailStats.productViewCount)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] text-slate-400">Cart adds</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(detailStats.cartAddCount)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] text-slate-400">Orders observed</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(detailStats.orders.length)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-orange-500" />
                      <h3 className="text-sm font-semibold text-slate-950">Customer status</h3>
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Registered</span>
                        <span className="font-medium text-slate-700">
                          {detailStats.registrationEvent?.occurred_at
                            ? formatAbsoluteTime(detailStats.registrationEvent.occurred_at)
                            : "Not observed"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Last seen</span>
                        <span className="font-medium text-slate-700">
                          {detailStats.lastSeen ? formatAbsoluteTime(detailStats.lastSeen) : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Searches</span>
                        <span className="font-medium text-slate-700">{formatNumber(detailStats.searchCount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Avg. observed cart value</span>
                        <span className="font-medium text-slate-700">₹{formatNumber(Math.round(detailStats.avgCartValue))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-orange-500" />
                      <h3 className="text-sm font-semibold text-slate-950">Commerce signals</h3>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-400">Adds</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formatNumber(detailStats.cartAddCount)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-400">Removals</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formatNumber(detailStats.cartRemoveCount)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-400">Checkouts</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formatNumber(detailStats.checkoutCount)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-400">Logins</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{formatNumber(detailStats.loginCount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-orange-500" />
                          <h3 className="text-sm font-semibold text-slate-950">Products interacted with</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Most observed product intent for this customer.</p>
                      </div>
                    </div>
                  </div>
                  {detailStats.products.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-slate-400">No product activity observed in this window.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {detailStats.products.map((product, index) => (
                        <div key={`${product.name}-${index}`} className="flex items-center justify-between gap-4 px-5 py-4">
                          <p className="min-w-0 truncate text-sm font-medium text-slate-800">{product.name}</p>
                          <div className="flex shrink-0 items-center gap-4 text-xs text-slate-400">
                            <span>{formatNumber(product.views)} views</span>
                            <span>{formatNumber(product.adds)} adds</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-orange-500" />
                      <h3 className="text-sm font-semibold text-slate-950">Activity timeline</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Chronological customer events from the analytics activity API.</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {customerEvents.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-slate-400">No tracked activity found for this customer.</div>
                    ) : (
                      customerEvents.slice(0, 20).map((event) => (
                        <div key={event.id} className="flex gap-3 px-5 py-4">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                            {event.event_name.startsWith("cart_") ? (
                              <ShoppingCart className="h-3.5 w-3.5" />
                            ) : event.event_name === "product_viewed" ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : event.event_name.includes("search") ? (
                              <Search className="h-3.5 w-3.5" />
                            ) : event.event_name.includes("order") ? (
                              <Package className="h-3.5 w-3.5" />
                            ) : (
                              <Activity className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{activityLabel(event.event_name)}</p>
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {event.product?.name || event.order?.order_number || event.path || "No additional context"}
                                </p>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatRelativeTime(event.occurred_at)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                              <span>{event.session?.device || "Unknown device"}</span>
                              <span>{event.session?.browser || "Unknown browser"}</span>
                              {event.session?.source ? <span>{event.session.source}</span> : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {customerEvents.length > 20 ? (
                    <div className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-400">
                      Showing the latest 20 of {formatNumber(customerEvents.length)} tracked events.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] =
    useState<SortKey>("orders_created");

  const [page, setPage] = useState(1);

  const [data, setData] =
    useState<ProductAnalyticsResponse | null>(null);

  const [selectedProduct, setSelectedProduct] =
    useState<ProductAnalyticsDetail | null>(
      null
    );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  const requestId = useRef(0);

  const loadAnalytics = useCallback(
    async ({
      refresh = false,
      requestedPage = page,
    }: {
      refresh?: boolean;
      requestedPage?: number;
    } = {}) => {
      const currentRequestId =
        ++requestId.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();

        params.set("days", period);
        params.set(
          "ordering",
          `-${ordering}`
        );
        params.set(
          "page",
          String(requestedPage)
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        const response =
          await api.get<ProductAnalyticsResponse>(
            `/analytics/products/?${params.toString()}`
          );

        if (
          currentRequestId !==
          requestId.current
        ) {
          return;
        }

        setData(response.data);
      } catch (err: unknown) {
        if (
          currentRequestId !==
          requestId.current
        ) {
          return;
        }

        console.error(
          "Product analytics request failed:",
          err
        );

        const responseError = err as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        };

        setError(
          responseError.response?.data
            ?.detail ||
            responseError.response?.data
              ?.message ||
            "Unable to load product analytics right now."
        );
      } finally {
        if (
          currentRequestId ===
          requestId.current
        ) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      ordering,
      page,
      period,
      search,
    ]
  );

  /* Debounced request */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        loadAnalytics({
          requestedPage: page,
        });
      }, 300);

    return () =>
      window.clearTimeout(timer);
  }, [loadAnalytics, page]);

  const rows = data?.results || [];
  const summary = data?.summary;

  const hasPrevious = Boolean(
    data?.previous
  );

  const hasNext = Boolean(data?.next);

  /* ------------------------------------------------------------------------ */
  /* Derived report metrics                                                   */
  /* ------------------------------------------------------------------------ */

  const overallViewToCart =
    useMemo(() => {
      const views = Number(
        summary?.total_views || 0
      );

      const adds = Number(
        summary?.total_add_to_cart || 0
      );

      if (views <= 0) {
        return 0;
      }

      return (adds / views) * 100;
    }, [
      summary?.total_add_to_cart,
      summary?.total_views,
    ]);

  const overallViewToOrder =
    useMemo(() => {
      const views = Number(
        summary?.total_views || 0
      );

      const orders = Number(
        summary?.total_orders_created || 0
      );

      if (views <= 0) {
        return 0;
      }

      return (orders / views) * 100;
    }, [
      summary?.total_orders_created,
      summary?.total_views,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Current page insights                                                    */
  /* ------------------------------------------------------------------------ */

  const topViewed = useMemo(() => {
    return [...rows].sort(
      (a, b) =>
        getMetric(b, "views") -
        getMetric(a, "views")
    )[0];
  }, [rows]);

  const strongestCartIntent =
    useMemo(() => {
      return [...rows]
        .filter(
          (row) =>
            getMetric(row, "views") > 0
        )
        .sort(
          (a, b) =>
            getConversion(
              b,
              "view_to_cart_percent"
            ) -
            getConversion(
              a,
              "view_to_cart_percent"
            )
        )[0];
    }, [rows]);

  const mostAdded = useMemo(() => {
    return [...rows].sort(
      (a, b) =>
        getMetric(b, "add_to_cart") -
        getMetric(a, "add_to_cart")
    )[0];
  }, [rows]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-full bg-slate-50">
      <div className="space-y-7 p-6">

        {/* Header */}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Intelligence
                </p>

                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Product analytics
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Understand what customers discover,
              what they add to cart, and which products
              move closest to an order.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={period}
                onChange={(event) => {
                  setPage(1);
                  setPeriod(
                    event.target.value
                  );
                }}
                aria-label="Analytics date range"
                className="h-10 min-w-[148px] appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                {PERIOD_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAnalytics({
                  refresh: true,
                  requestedPage: page,
                })
              }
              disabled={
                loading || refreshing
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />
              Refresh
            </button>
          </div>
        </section>

        {/* Overview */}

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              High-level product activity for the
              selected period.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Product views"
              value={formatNumber(
                summary?.total_views
              )}
              description="Tracked product detail views"
              icon={Eye}
              emphasis="primary"
            />

            <StatCard
              title="Unique sessions"
              value={formatNumber(
                summary?.total_unique_sessions
              )}
              description="Distinct browsing sessions"
              icon={Users}
            />

            <StatCard
              title="Unique customers"
              value={formatNumber(
                summary?.total_unique_customers
              )}
              description="Authenticated customers"
              icon={Users}
            />

            <StatCard
              title="Products analysed"
              value={formatNumber(
                summary?.total_products
              )}
              description="Products with tracked activity"
              icon={Package}
            />
          </div>
        </section>

        {/* Customer intent */}

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Customer intent
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Signals that show how product interest
              turns into action.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Add to cart"
              value={formatNumber(
                summary?.total_add_to_cart
              )}
              description="Total cart additions"
              icon={ShoppingCart}
              emphasis="primary"
            />

            <StatCard
              title="Removed from cart"
              value={formatNumber(
                summary?.total_remove_from_cart
              )}
              description="Total cart removals"
              icon={Trash2}
            />

            <StatCard
              title="Quantity added"
              value={formatNumber(
                summary?.total_quantity_added
              )}
              description="Total units added"
              icon={TrendingUp}
            />

            <StatCard
              title="Orders created"
              value={formatNumber(
                summary?.total_orders_created
              )}
              description="Orders created from tracked events"
              icon={ClipboardList}
              emphasis="dark"
            />
          </div>
        </section>

        {/* Conversion */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />

                <h2 className="text-sm font-semibold text-slate-950">
                  Conversion snapshot
                </h2>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Product attention and intent for the selected period.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  View → cart
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatPercent(
                    overallViewToCart
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  View → order
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatPercent(
                    overallViewToOrder
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Insights */}

        {!loading &&
        rows.length > 0 ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Quick insights
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Highlights from the products currently visible.
                </p>
              </div>

              <Sparkles className="hidden h-4 w-4 text-orange-500 sm:block" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <InsightCard
                eyebrow="Top viewed"
                title="Customer attention"
                value={
                  topViewed
                    ? topViewed
                        .product
                        ?.name ||
                      `Product #${topViewed.product_id}`
                    : "—"
                }
                helper={
                  topViewed
                    ? `${formatNumber(
                        getMetric(
                          topViewed,
                          "views"
                        )
                      )} views`
                    : "No data"
                }
                icon={Eye}
              />

              <InsightCard
                eyebrow="Strongest intent"
                title="View → cart"
                value={
                  strongestCartIntent
                    ? strongestCartIntent
                        .product
                        ?.name ||
                      `Product #${strongestCartIntent.product_id}`
                    : "—"
                }
                helper={
                  strongestCartIntent
                    ? `${formatPercent(
                        getConversion(
                          strongestCartIntent,
                          "view_to_cart_percent"
                        )
                      )} conversion`
                    : "No data"
                }
                icon={TrendingUp}
              />

              <InsightCard
                eyebrow="Most added"
                title="Cart demand"
                value={
                  mostAdded
                    ? mostAdded.product
                        ?.name ||
                      `Product #${mostAdded.product_id}`
                    : "—"
                }
                helper={
                  mostAdded
                    ? `${formatNumber(
                        getMetric(
                          mostAdded,
                          "add_to_cart"
                        )
                      )} cart additions`
                    : "No data"
                }
                icon={ShoppingCart}
              />
            </div>
          </section>
        ) : null}

        {/* Filters */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 sm:flex">
                <Filter className="h-4 w-4" />
              </div>

              <div className="relative min-w-0 flex-1 xl:max-w-2xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(
                      event.target.value
                    );
                  }}
                  placeholder="Search by product, brand or category..."
                  aria-label="Search product analytics"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />

                <span className="hidden sm:inline">
                  Sort by
                </span>
              </div>

              <select
                value={ordering}
                onChange={(event) => {
                  setPage(1);
                  setOrdering(
                    event.target
                      .value as SortKey
                  );
                }}
                aria-label="Sort analytics"
                className="h-11 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      Highest {option.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Error */}

        {error ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <p className="text-sm font-semibold text-red-800">
              Analytics could not be loaded.
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadAnalytics({
                  refresh: true,
                  requestedPage: page,
                })
              }
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </section>
        ) : null}

        {/* Product performance */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Product performance
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Compare product discovery, customer intent,
                cart behaviour and conversion.
              </p>
            </div>

            <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              {loading
                ? "Updating..."
                : `${formatNumber(
                    data?.count
                  )} products`}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({
                length: 7,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[66px] animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <Package className="h-5 w-5 text-slate-400" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-950">
                No product analytics found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                No tracked products match the current
                filters. Try another period or search term.
              </p>

              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Clear search
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Product
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Views
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Sessions
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Customers
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Cart adds
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Removed
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Qty
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Orders
                      </th>

                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        View → cart
                      </th>

                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        View → order
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const views =
                        getMetric(
                          row,
                          "views"
                        );

                      const cartAdds =
                        getMetric(
                          row,
                          "add_to_cart"
                        );

                      const orders =
                        getMetric(
                          row,
                          "orders_created"
                        );

                      const viewToCart =
                        getConversion(
                          row,
                          "view_to_cart_percent"
                        );

                      const viewToOrder =
                        getConversion(
                          row,
                          "view_to_order_percent"
                        );

                      const brand =
                        row.product?.brand ||
                        null;

                      const category =
                        row.product?.category ||
                        null;

                      return (
                        <tr
                          key={String(
                            row.product_id
                          )}
                          tabIndex={0}
                          role="button"
                          aria-label={`View analytics for ${
                            row.product?.name ||
                            `product ${row.product_id}`
                          }`}
                          onClick={() =>
                            setSelectedProduct(
                              row
                            )
                          }
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              setSelectedProduct(
                                row
                              );
                            }
                          }}
                          className="group cursor-pointer outline-none transition hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-inset focus:ring-orange-200"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[390px]">
                              <p className="truncate text-sm font-semibold text-slate-950 group-hover:text-orange-700">
                                {row.product
                                  ?.name ||
                                  `Product #${row.product_id}`}
                              </p>

                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                                <span>
                                  ID #
                                  {
                                    row.product_id
                                  }
                                </span>

                                {brand ? (
                                  <>
                                    <span>
                                      •
                                    </span>

                                    <span className="max-w-[130px] truncate">
                                      {brand}
                                    </span>
                                  </>
                                ) : null}

                                {category ? (
                                  <>
                                    <span>
                                      •
                                    </span>

                                    <span className="max-w-[160px] truncate">
                                      {category}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span className="font-semibold text-slate-950">
                              {formatNumber(
                                views
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-700">
                            {formatNumber(
                              getMetric(
                                row,
                                "unique_sessions"
                              )
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-700">
                            {formatNumber(
                              getMetric(
                                row,
                                "unique_customers"
                              )
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span
                              className={
                                cartAdds > 0
                                  ? "font-semibold text-slate-950"
                                  : "text-slate-400"
                              }
                            >
                              {formatNumber(
                                cartAdds
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-700">
                            {formatNumber(
                              getMetric(
                                row,
                                "remove_from_cart"
                              )
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-700">
                            {formatNumber(
                              getMetric(
                                row,
                                "quantity_added"
                              )
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span
                              className={
                                orders > 0
                                  ? "font-semibold text-slate-950"
                                  : "text-slate-400"
                              }
                            >
                              {formatNumber(
                                orders
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span
                              className={[
                                "inline-flex min-w-[66px] justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                                viewToCart >
                                0
                                  ? "bg-orange-50 text-orange-700"
                                  : "bg-slate-100 text-slate-500",
                              ].join(" ")}
                            >
                              {formatPercent(
                                viewToCart
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={[
                                "inline-flex min-w-[66px] justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                                viewToOrder >
                                0
                                  ? "bg-slate-950 text-white"
                                  : "bg-slate-100 text-slate-500",
                              ].join(" ")}
                            >
                              {formatPercent(
                                viewToOrder
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Page{" "}
                  <span className="font-semibold text-slate-700">
                    {page}
                  </span>{" "}
                  ·{" "}
                  <span className="font-semibold text-slate-700">
                    {formatNumber(
                      data?.count
                    )}
                  </span>{" "}
                  total products
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !hasPrevious ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4 rotate-90" />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      !hasNext ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ArrowUp className="h-4 w-4 rotate-90" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Live Activity */}

        <LiveActivityPanel />

        {/* Search Analytics */}

        <SearchAnalyticsPanel />

        {/* Cart & Checkout Intelligence */}

        <CartCheckoutPanel />

        {/* Customer 360 */}

        <Customer360Panel />

        {/* Footer note */}

        <div className="flex items-start gap-2 px-1 pb-2 text-xs leading-5 text-slate-400">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />

          <p>
            Analytics are based on tracked BlazeLine
            product activity for the selected period.
            Conversion figures reflect the events currently
            available to the reporting API.
          </p>
        </div>
      </div>

      {/* Product detail drawer */}

      <ProductDetailDrawer
        product={selectedProduct}
        onClose={() =>
          setSelectedProduct(null)
        }
      />
    </div>
  );
}