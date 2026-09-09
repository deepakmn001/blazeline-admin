"use client";

import { useEffect } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  Package,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

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

export type ProductAnalyticsDetail = {
  product_id: number | string;
  product?: ProductInfo;
  metrics?: ProductMetrics;
  conversion?: ProductConversion;
};

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

function metric(
  product: ProductAnalyticsDetail,
  key: keyof ProductMetrics
) {
  return Number(product.metrics?.[key] || 0);
}

function conversion(
  product: ProductAnalyticsDetail,
  key: keyof ProductConversion
) {
  return Number(product.conversion?.[key] || 0);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  emphasis = "default",
}: {
  label: string;
  value: string;
  icon: typeof Eye;
  emphasis?: "default" | "primary" | "dark";
}) {
  const iconClass =
    emphasis === "primary"
      ? "bg-orange-50 text-orange-600"
      : emphasis === "dark"
        ? "bg-slate-950 text-white"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconClass,
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ConversionRow({
  label,
  value,
  description,
  dark = false,
}: {
  label: string;
  value: number;
  description: string;
  dark?: boolean;
}) {
  const positive = value > 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {label}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <span
        className={[
          "inline-flex min-w-[70px] shrink-0 justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold",
          dark
            ? positive
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-500"
            : positive
              ? "bg-orange-50 text-orange-700"
              : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {formatPercent(value)}
      </span>
    </div>
  );
}

export default function ProductDetailDrawer({
  product,
  onClose,
}: {
  product: ProductAnalyticsDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!product) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        originalOverflow;
    };
  }, [onClose, product]);

  if (!product) {
    return null;
  }

  const name =
    product.product?.name ||
    `Product #${product.product_id}`;

  const brand =
    product.product?.brand || null;

  const category =
    product.product?.category || null;

  const subcategory =
    product.product?.subcategory || null;

  const views = metric(product, "views");
  const sessions = metric(
    product,
    "unique_sessions"
  );
  const customers = metric(
    product,
    "unique_customers"
  );
  const cartAdds = metric(
    product,
    "add_to_cart"
  );
  const removed = metric(
    product,
    "remove_from_cart"
  );
  const quantity = metric(
    product,
    "quantity_added"
  );
  const orders = metric(
    product,
    "orders_created"
  );

  const viewToCart = conversion(
    product,
    "view_to_cart_percent"
  );

  const cartToOrder = conversion(
    product,
    "cart_to_order_percent"
  );

  const viewToOrder = conversion(
    product,
    "view_to_order_percent"
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      aria-labelledby="product-analytics-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}

      <button
        type="button"
        aria-label="Close product details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
      />

      {/* Drawer */}

      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        {/* Header */}

        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Package className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
                  Product intelligence
                </p>

                <h2
                  id="product-analytics-title"
                  className="mt-1 line-clamp-2 text-lg font-semibold leading-6 tracking-tight text-slate-950"
                >
                  {name}
                </h2>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>
                    ID #{product.product_id}
                  </span>

                  {brand ? (
                    <>
                      <span>•</span>
                      <span>{brand}</span>
                    </>
                  ) : null}

                  {category ? (
                    <>
                      <span>•</span>
                      <span>{category}</span>
                    </>
                  ) : null}
                </div>

                {subcategory ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {subcategory}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="space-y-6">
            {/* Summary */}

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />

                <h3 className="text-sm font-semibold text-slate-950">
                  Activity summary
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Views"
                  value={formatNumber(views)}
                  icon={Eye}
                  emphasis="primary"
                />

                <MetricCard
                  label="Unique sessions"
                  value={formatNumber(
                    sessions
                  )}
                  icon={Users}
                />

                <MetricCard
                  label="Unique customers"
                  value={formatNumber(
                    customers
                  )}
                  icon={Users}
                />

                <MetricCard
                  label="Add to cart"
                  value={formatNumber(
                    cartAdds
                  )}
                  icon={ShoppingCart}
                  emphasis="primary"
                />

                <MetricCard
                  label="Removed"
                  value={formatNumber(
                    removed
                  )}
                  icon={Trash2}
                />

                <MetricCard
                  label="Quantity added"
                  value={formatNumber(
                    quantity
                  )}
                  icon={TrendingUp}
                />

                <MetricCard
                  label="Orders"
                  value={formatNumber(orders)}
                  icon={CheckCircle2}
                  emphasis="dark"
                />

                <MetricCard
                  label="Product ID"
                  value={String(
                    product.product_id
                  )}
                  icon={Package}
                />
              </div>
            </section>

            {/* Customer journey */}

            <section>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  Customer journey
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  How product attention is moving toward
                  cart and order activity.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-center">
                    <div className="text-xl font-semibold text-slate-950">
                      {formatNumber(views)}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Views
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />

                  <div className="min-w-0 text-center">
                    <div className="text-xl font-semibold text-slate-950">
                      {formatNumber(cartAdds)}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Cart
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />

                  <div className="min-w-0 text-center">
                    <div className="text-xl font-semibold text-slate-950">
                      {formatNumber(orders)}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Orders
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          viewToCart
                        )
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-center text-xs text-slate-400">
                  {formatPercent(
                    viewToCart
                  )}{" "}
                  of views resulted in a cart addition
                </p>
              </div>
            </section>

            {/* Conversion */}

            <section>
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />

                  <h3 className="text-sm font-semibold text-slate-950">
                    Conversion performance
                  </h3>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The conversion ratios currently available
                  from the analytics API.
                </p>
              </div>

              <div className="space-y-2.5">
                <ConversionRow
                  label="View → Cart"
                  value={viewToCart}
                  description="Product views that produced cart additions"
                />

                <ConversionRow
                  label="Cart → Order"
                  value={cartToOrder}
                  description="Cart additions that produced order creation"
                />

                <ConversionRow
                  label="View → Order"
                  value={viewToOrder}
                  description="Product views that produced order creation"
                  dark
                />
              </div>
            </section>

            {/* Interpretation */}

            <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    What this tells you
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Views show customer attention, cart additions
                    show purchase intent, and order creation shows
                    the final tracked outcome available to this
                    report.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close details
          </button>
        </div>
      </aside>
    </div>
  );
}