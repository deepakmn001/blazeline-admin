"use client";

import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Mail,
  Package,
  Send,
  Upload,
  Loader2,
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdminInvoice,
  getAdminInvoiceOverview,
  getAdminInvoices,
  sendAdminInvoiceEmail,
  type DeliveryStatus,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/services/invoice.service";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | ""; label: string }> = [
  { value: "", label: "All invoice states" },
  { value: "pending", label: "Pending" },
  { value: "generated", label: "Generated" },
  { value: "partially_sent", label: "Partially sent" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

const DELIVERY_OPTIONS: Array<{ value: DeliveryStatus | ""; label: string }> = [
  { value: "", label: "All delivery states" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "not_applicable", label: "Not applicable" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: string | number | null | undefined, currency = "INR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadge(
  status: string,
): "default" | "brand" | "info" | "success" | "warning" | "danger" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "generated") return "info";
  if (status === "pending") return "brand";
  if (status === "partially_sent") return "warning";
  return "default";
}

function deliveryBadge(
  status: string,
): "default" | "info" | "success" | "warning" | "danger" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "default";
}

function addressLines(invoice: InvoiceRecord) {
  return [
    invoice.billing_address_line1,
    invoice.billing_address_line2,
    invoice.billing_landmark,
    [invoice.billing_city, invoice.billing_state]
      .filter(Boolean)
      .join(", "),
    invoice.billing_pincode,
  ].filter(Boolean);
}

function getErrorMessage(error: unknown) {
  const axiosError = error as {
    response?: { data?: unknown };
    message?: string;
  };

  const payload = axiosError?.response?.data;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;

    const first = Object.values(record)[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }

  return axiosError?.message || "Something went wrong. Please try again.";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tone?: "slate" | "brand" | "emerald" | "amber" | "red";
}) {
  const iconClasses = {
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClasses[tone]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          Live
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
        {label}
      </dt>
      <dd
        className={`mt-1.5 break-words text-sm text-ink ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function DeliveryPill({
  label,
  status,
}: {
  label: string;
  status: DeliveryStatus;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <Badge variant={deliveryBadge(status)}>{titleCase(status)}</Badge>
    </div>
  );
}

function InvoiceDetailDrawer({
  invoice,
  loading,
  onClose,
  onSend,
}: {
  invoice: InvoiceRecord | null;
  loading: boolean;
  onClose: () => void;
  onSend: (invoice: InvoiceRecord) => void;
}) {
  if (!invoice && !loading) return null;

  const totalTax = Number(invoice?.tax_amount ?? 0);
  const items = invoice?.items ?? [];

  return (
    <div className="fixed inset-0 z-[80] flex">
      <button
        type="button"
        aria-label="Close invoice details"
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative ml-auto flex h-full w-full max-w-3xl flex-col border-l border-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-700">
                Invoice
              </span>
              {invoice && (
                <Badge variant={statusBadge(invoice.status)}>
                  {titleCase(invoice.status)}
                </Badge>
              )}
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink">
              {invoice?.invoice_number || "Loading invoice…"}
            </h2>
            {invoice && (
              <p className="mt-1 text-xs text-ink-soft">
                Order #{invoice.order_number || invoice.order_id} · Issued{" "}
                {formatDate(invoice.issued_at)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invoice?.customer_email ? (
              <Button
                size="sm"
                onClick={() => invoice && onSend(invoice)}
              >
                <Send className="h-3.5 w-3.5" />
                {invoice.email_status === "sent" ? "Resend invoice" : "Send invoice"}
              </Button>
            ) : null}

            {invoice?.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open PDF
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition hover:bg-canvas hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : invoice ? (
            <div className="space-y-4">
              <Section title="Invoice & payment" icon={FileCheck2}>
                <dl className="grid gap-5 p-5 sm:grid-cols-2">
                  <DetailRow label="Invoice number" value={invoice.invoice_number} mono />
                  <DetailRow label="Order number" value={invoice.order_number || `#${invoice.order_id}`} />
                  <DetailRow label="Invoice status" value={<Badge variant={statusBadge(invoice.status)}>{titleCase(invoice.status)}</Badge>} />
                  <DetailRow label="Issued" value={formatDate(invoice.issued_at)} />
                  <DetailRow label="Payment method" value={titleCase(invoice.payment_method)} />
                  <DetailRow label="Payment status" value={<Badge variant={invoice.payment_status?.toLowerCase() === "paid" ? "success" : "warning"}>{titleCase(invoice.payment_status)}</Badge>} />
                  <DetailRow label="Razorpay payment ID" value={invoice.razorpay_payment_id || "Not applicable"} mono />
                  <DetailRow label="Currency" value={invoice.currency} />
                </dl>
              </Section>

              <Section title="Customer snapshot" icon={UserRound}>
                <dl className="grid gap-5 p-5 sm:grid-cols-2">
                  <DetailRow label="Customer" value={invoice.customer_name} />
                  <DetailRow label="Company" value={invoice.company_name || "Individual"} />
                  <DetailRow label="Email" value={<a className="text-brand-700 hover:underline" href={`mailto:${invoice.customer_email}`}>{invoice.customer_email || "Not provided"}</a>} />
                  <DetailRow label="Phone" value={<a className="text-brand-700 hover:underline" href={`tel:${invoice.customer_phone}`}>{invoice.customer_phone || "Not provided"}</a>} />
                  <DetailRow label="GSTIN" value={invoice.customer_gstin || "Not provided"} mono />
                  <DetailRow label="Customer ID" value={invoice.customer_id} mono />
                </dl>
              </Section>

              <Section title="Billing address" icon={Package}>
                <div className="p-5">
                  <div className="rounded-2xl border border-line bg-canvas p-4">
                    {addressLines(invoice).map((line, index) => (
                      <p key={`${line}-${index}`} className="text-sm leading-6 text-ink">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title={`Order items · ${items.length}`} icon={FileText}>
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left">
                    <thead>
                      <tr className="border-b border-line bg-canvas/70 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                        <th className="px-5 py-3">Product</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit</th>
                        <th className="px-4 py-3 text-right">GST</th>
                        <th className="px-5 py-3 text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-line last:border-b-0">
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-ink">{item.product_name}</p>
                            {item.variant_name ? (
                              <p className="mt-1 text-xs text-ink-soft">{item.variant_name}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-ink-soft">{item.sku}</td>
                          <td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-ink">{item.quantity}</td>
                          <td className="px-4 py-4 text-right text-sm tabular-nums text-ink-soft">{formatMoney(item.unit_price, item.currency)}</td>
                          <td className="px-4 py-4 text-right text-xs text-ink-soft">
                            <div>{item.tax_rate}%</div>
                            <div>{formatMoney(item.tax_amount, item.currency)}</div>
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-ink">{formatMoney(item.line_total, item.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {items.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-ink-soft">
                    No invoice items were returned by the API.
                  </div>
                ) : null}
              </Section>

              <Section title="Commercial summary" icon={WalletCards}>
                <div className="p-5">
                  <div className="ml-auto max-w-md space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">Subtotal</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">Discount</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(invoice.discount_amount, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">Delivery</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(invoice.delivery_charge, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">COD fee</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(invoice.cod_fee, invoice.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">GST / Tax</span>
                      <span className="font-medium tabular-nums text-ink">{formatMoney(totalTax, invoice.currency)}</span>
                    </div>
                    <div className="border-t border-line pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-ink">Grand total</span>
                        <span className="text-xl font-semibold tracking-tight text-brand-700">
                          {formatMoney(invoice.grand_total, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Delivery & diagnostics" icon={Mail}>
                <div className="space-y-3 p-5">
                  <DeliveryPill label="Email delivery" status={invoice.email_status} />
                  <DeliveryPill label="WhatsApp delivery" status={invoice.whatsapp_status} />

                  <dl className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                    <DetailRow label="Email sent" value={formatDate(invoice.email_sent_at)} />
                    <DetailRow label="WhatsApp sent" value={formatDate(invoice.whatsapp_sent_at)} />
                    <DetailRow label="Delivery attempts" value={invoice.delivery_attempts} />
                    <DetailRow label="Last updated" value={formatDate(invoice.updated_at)} />
                  </dl>

                  {invoice.email_error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-800">Email error</p>
                      <p className="mt-1 break-words text-xs leading-5 text-red-700">{invoice.email_error}</p>
                    </div>
                  ) : null}

                  {invoice.whatsapp_error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-800">WhatsApp error</p>
                      <p className="mt-1 break-words text-xs leading-5 text-red-700">{invoice.whatsapp_error}</p>
                    </div>
                  ) : null}

                  {invoice.last_error ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">Latest workflow error</p>
                      <p className="mt-1 break-words text-xs leading-5 text-amber-700">{invoice.last_error}</p>
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section title="Stored PDF asset" icon={Download}>
                <div className="p-5">
                  <div className="rounded-2xl border border-line bg-canvas p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">Invoice PDF</p>
                        <p className="mt-1 break-all text-xs text-ink-soft">
                          {invoice.pdf_public_id || "No storage identifier"}
                        </p>
                      </div>
                      {invoice.pdf_url ? (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open PDF
                        </a>
                      ) : (
                        <span className="text-xs text-ink-faint">
                          PDF uses authenticated storage.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Invoice details could not be loaded.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}



function SendInvoiceDialog({
  invoice,
  open,
  mode,
  file,
  sending,
  onOpenChange,
  onModeChange,
  onFileChange,
  onSend,
}: {
  invoice: InvoiceRecord | null;
  open: boolean;
  mode: "default" | "custom";
  file: File | null;
  sending: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: "default" | "custom") => void;
  onFileChange: (file: File | null) => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
          <DialogDescription>
            Send the invoice to the customer email captured on the invoice. The
            recipient cannot be changed from this admin action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-line bg-canvas px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Invoice
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">
                  {invoice?.invoice_number || "—"}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Customer email
                </p>
                <p className="mt-1 truncate text-sm text-ink-soft">
                  {invoice?.customer_email || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onModeChange("default")}
              disabled={sending}
              className={`rounded-xl border p-4 text-left transition ${
                mode === "default"
                  ? "border-brand-300 bg-brand-50 ring-2 ring-brand-100"
                  : "border-line bg-white hover:bg-canvas"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Default invoice</p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Use the standard BlazeLine system-generated invoice PDF.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onModeChange("custom")}
              disabled={sending}
              className={`rounded-xl border p-4 text-left transition ${
                mode === "custom"
                  ? "border-brand-300 bg-brand-50 ring-2 ring-brand-100"
                  : "border-line bg-white hover:bg-canvas"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Upload className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Custom PDF</p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    Attach your own final invoice PDF for this email only.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {mode === "custom" ? (
            <label className="block rounded-xl border border-dashed border-line bg-canvas p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Upload className="h-4 w-4 text-brand-600" />
                Choose invoice PDF
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={sending}
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-xs text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink file:shadow-card"
              />
              <p className="mt-2 text-[11px] leading-5 text-ink-faint">
                PDF only · maximum 10 MB · this upload does not replace the stored invoice PDF.
              </p>
              {file ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate font-medium">{file.name}</span>
                  <span className="shrink-0 text-emerald-700">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : null}
            </label>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Sending is manual. No invoice email is sent automatically when an order is completed.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={onSend}
            disabled={sending || !invoice?.customer_email || (mode === "custom" && !file)}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : mode === "custom" ? "Send custom invoice" : "Send invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState<DeliveryStatus | "">("");
  const [whatsappStatus, setWhatsappStatus] = useState<DeliveryStatus | "">("");
  const [ordering, setOrdering] = useState("-issued_at");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<InvoiceRecord[]>([]);
  const [count, setCount] = useState(0);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAdminInvoiceOverview>> | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [sendTarget, setSendTarget] = useState<InvoiceRecord | null>(null);
  const [sendMode, setSendMode] = useState<"default" | "custom">("default");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, paymentStatus, emailStatus, whatsappStatus, ordering]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await getAdminInvoiceOverview());
    } catch (loadError) {
      setOverview(null);
      setError(getErrorMessage(loadError));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);

    try {
      const data = await getAdminInvoices({
        q: debouncedSearch || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        email_status: emailStatus || undefined,
        whatsapp_status: whatsappStatus || undefined,
        ordering,
        page,
        page_size: PAGE_SIZE,
      });

      setRows(data.results);
      setCount(data.count);
      setError("");
    } catch (loadError) {
      setRows([]);
      setCount(0);
      setError(getErrorMessage(loadError));
    } finally {
      setListLoading(false);
    }
  }, [
    debouncedSearch,
    emailStatus,
    ordering,
    page,
    paymentStatus,
    status,
    whatsappStatus,
  ]);

  useEffect(() => {
    void Promise.all([loadOverview(), loadList()]);
  }, [loadList, loadOverview]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadOverview(), loadList()]);
    setRefreshing(false);
  }, [loadList, loadOverview]);

  const openInvoice = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setSelectedInvoice(null);

    try {
      setSelectedInvoice(await getAdminInvoice(id));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const requestSend = useCallback((invoice: InvoiceRecord) => {
    setSendTarget(invoice);
    setSendMode("default");
    setCustomFile(null);
  }, []);

  const handleSendInvoice = useCallback(async () => {
    if (!sendTarget) return;

    if (sendMode === "custom") {
      if (!customFile) {
        setError("Choose a PDF file before sending the custom invoice.");
        return;
      }
      if (customFile.size > 10 * 1024 * 1024) {
        setError("Custom invoice PDF must be 10 MB or smaller.");
        return;
      }
      const isPdf = customFile.type === "application/pdf" || customFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setError("Only PDF files can be sent as custom invoices.");
        return;
      }
    }

    setSendingInvoice(true);
    setError("");

    try {
      await sendAdminInvoiceEmail(
        sendTarget.id,
        sendMode === "custom"
          ? { mode: "custom", file: customFile as File }
          : { mode: "default" },
      );

      setSendTarget(null);
      setCustomFile(null);
      setSendMode("default");

      await Promise.all([loadOverview(), loadList()]);

      if (selectedId === sendTarget.id) {
        try {
          setSelectedInvoice(await getAdminInvoice(sendTarget.id));
        } catch {
          // The send succeeded; keeping the existing drawer is safer than
          // turning a successful action into a visible fetch error.
        }
      }
    } catch (sendError) {
      setError(getErrorMessage(sendError));
    } finally {
      setSendingInvoice(false);
    }
  }, [customFile, loadList, loadOverview, selectedId, sendMode, sendTarget]);

  const closeSendDialog = useCallback((open: boolean) => {
    if (!open && sendingInvoice) return;
    if (!open) {
      setSendTarget(null);
      setCustomFile(null);
      setSendMode("default");
    }
  }, [sendingInvoice]);

  const closeInvoice = () => {
    setSelectedId(null);
    setSelectedInvoice(null);
    setDetailLoading(false);
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const summaryCards = useMemo(
    () => [
      { label: "Total invoices", value: overview?.total ?? count, icon: FileText, tone: "slate" as const },
      { label: "Generated", value: overview?.generated ?? 0, icon: FileCheck2, tone: "info" as const },
      { label: "Sent", value: overview?.sent ?? 0, icon: ShieldCheck, tone: "emerald" as const },
      { label: "Email pending", value: overview?.email_pending ?? 0, icon: Mail, tone: "amber" as const },
      { label: "Failed", value: overview?.failed ?? 0, icon: AlertCircle, tone: "red" as const },
    ],
    [count, overview],
  );

  const hasFilters = Boolean(
    debouncedSearch || status || paymentStatus || emailStatus || whatsappStatus,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
            <FileText className="h-4 w-4" />
            Sales / Invoices
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Invoices
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Central view of every generated invoice, customer snapshot, payment, PDF and delivery state.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing || listLoading || overviewLoading}
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            tone={card.tone === "info" ? "brand" : card.tone}
          />
        ))}
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, order, customer, email, phone, GSTIN or Razorpay ID…"
                className="pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as InvoiceStatus | "")}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All payment states</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={emailStatus}
              onChange={(event) => setEmailStatus(event.target.value as DeliveryStatus | "")}
              className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {DELIVERY_OPTIONS.map((option) => (
                <option key={`email-${option.value || "all"}`} value={option.value}>
                  Email · {option.label}
                </option>
              ))}
            </select>

            <select
              value={whatsappStatus}
              onChange={(event) => setWhatsappStatus(event.target.value as DeliveryStatus | "")}
              className="h-9 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {DELIVERY_OPTIONS.map((option) => (
                <option key={`wa-${option.value || "all"}`} value={option.value}>
                  WhatsApp · {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setOrdering((current) =>
                  current === "-issued_at" ? "issued_at" : "-issued_at",
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              {ordering === "-issued_at" ? "Newest first" : "Oldest first"}
            </button>

            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPaymentStatus("");
                  setEmailStatus("");
                  setWhatsappStatus("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-ink-soft transition hover:bg-canvas hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1240px] w-full text-left">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                <th className="px-5 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-5 py-3 text-right">Issued</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {listLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-line">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink">
                      No invoices found
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {hasFilters
                        ? "Try changing the filters or search phrase."
                        : "Invoices will appear here once the invoice API returns records."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer border-b border-line transition hover:bg-canvas/60"
                    onClick={() => void openInvoice(invoice.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {invoice.invoice_number}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge variant={statusBadge(invoice.status)}>
                            {titleCase(invoice.status)}
                          </Badge>
                          <span className="text-[10.5px] text-ink-faint">
                            {invoice.items?.length ?? 0} item
                            {(invoice.items?.length ?? 0) === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-0 max-w-[260px]">
                        <p className="truncate text-sm font-semibold text-ink">
                          {invoice.customer_name || "Unknown customer"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-soft">
                          {invoice.customer_email || invoice.customer_phone || "No contact"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-mono text-[11px] font-medium text-ink-soft">
                        {invoice.order_number || `#${invoice.order_id}`}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        {formatMoney(invoice.grand_total, invoice.currency)}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <Badge
                          variant={
                            invoice.payment_status?.toLowerCase() === "paid"
                              ? "success"
                              : "warning"
                          }
                        >
                          {titleCase(invoice.payment_status)}
                        </Badge>
                        <p className="text-[10.5px] text-ink-faint">
                          {titleCase(invoice.payment_method)}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-soft">
                          <Mail className="h-3.5 w-3.5 text-ink-faint" />
                          <span>Email</span>
                          <Badge variant={deliveryBadge(invoice.email_status)}>
                            {titleCase(invoice.email_status)}
                          </Badge>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-ink-soft">
                          <Phone className="h-3.5 w-3.5 text-ink-faint" />
                          <span>WhatsApp</span>
                          <Badge variant={deliveryBadge(invoice.whatsapp_status)}>
                            {titleCase(invoice.whatsapp_status)}
                          </Badge>
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="whitespace-nowrap text-xs font-medium text-ink-soft">
                        {formatDate(invoice.issued_at)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!invoice.customer_email}
                        onClick={(event) => {
                          event.stopPropagation();
                          requestSend(invoice);
                        }}
                        title={invoice.customer_email ? undefined : "Customer email is not available"}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {invoice.email_status === "sent" ? "Resend" : "Send"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-ink-faint">
            {count === 0
              ? "No invoices"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  count,
                )} of ${count.toLocaleString("en-IN")}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-24 text-center text-xs font-medium text-ink-soft">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <SendInvoiceDialog
        invoice={sendTarget}
        open={Boolean(sendTarget)}
        mode={sendMode}
        file={customFile}
        sending={sendingInvoice}
        onOpenChange={closeSendDialog}
        onModeChange={setSendMode}
        onFileChange={setCustomFile}
        onSend={() => void handleSendInvoice()}
      />

      {selectedId ? (
        <InvoiceDetailDrawer
          invoice={selectedInvoice}
          loading={detailLoading}
          onClose={closeInvoice}
          onSend={requestSend}
        />
      ) : null}
    </div>
  );
}
