"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LogIn,
  Mail,
  MonitorDot,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAdminLoginActivity,
  type LoginActivityDays,
  type LoginActivityItem,
  type LoginActivityType,
} from "@/services/login-activity.service";

const PAGE_SIZE = 50;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function customerInitials(item: LoginActivityItem) {
  const source =
    item.customer_name?.trim() ||
    item.customer_email?.trim() ||
    item.customer_phone?.trim() ||
    "U";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function ActivityPill({
  type,
}: {
  type: LoginActivityItem["activity_type"];
}) {
  const failed = type === "login_failed";

  return (
    <span
      className={
        failed
          ? "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10.5px] font-semibold text-red-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700"
      }
    >
      {failed ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <LogIn className="h-3 w-3" />
      )}
      {failed ? "Failed Login" : "Login Success"}
    </span>
  );
}

export default function LoginActivityPage() {
  const [days, setDays] = React.useState<LoginActivityDays>(30);
  const [event, setEvent] = React.useState<LoginActivityType>("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [data, setData] =
    React.useState<Awaited<ReturnType<typeof getAdminLoginActivity>> | null>(
      null
    );
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await getAdminLoginActivity({
          days,
          event,
          q: search,
          page,
          page_size: PAGE_SIZE,
        });

        setData(response);
      } catch (error) {
        console.error("Login activity request failed:", error);
        toast.error("Unable to load login activity.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, event, page, search]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [load, search]);

  const totalPages = Math.max(
    1,
    Math.ceil((data?.count ?? 0) / PAGE_SIZE)
  );

  const summary = data?.summary ?? {
    total: 0,
    successful_logins: 0,
    failed_logins: 0,
  };

  const changeDays = (value: LoginActivityDays) => {
    setDays(value);
    setPage(1);
  };

  const changeEvent = (value: LoginActivityType) => {
    setEvent(value);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const goToPage = (value: number) => {
    if (value < 1 || value > totalPages || value === page) return;
    setPage(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/customers"
            className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to customers
          </Link>

          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            <History className="h-3.5 w-3.5" />
            Customer Security
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Login Activity
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-soft">
            One centralized view of customer login activity with server-side
            timestamps, identity, device context, IP and activity type.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Login Events",
            value: summary.total,
            helper: `Last ${days} days`,
            icon: History,
            tone: "brand",
          },
          {
            label: "Successful Logins",
            value: summary.successful_logins,
            helper: "Authenticated customers",
            icon: ShieldCheck,
            tone: "emerald",
          },
          {
            label: "Failed Logins",
            value: summary.failed_logins,
            helper: "Authentication attempts",
            icon: AlertTriangle,
            tone: "red",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                card.tone === "emerald"
                  ? "bg-emerald-50 text-emerald-600"
                  : card.tone === "red"
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-50 text-brand-600"
              }`}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {loading ? "—" : card.value.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{card.helper}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Search customer, email, phone or IP..."
                className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={days}
                onChange={(event) =>
                  changeDays(Number(event.target.value) as LoginActivityDays)
                }
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink-soft outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              <select
                value={event}
                onChange={(value) =>
                  changeEvent(value.target.value as LoginActivityType)
                }
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink-soft outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="all">All login activity</option>
                <option value="login_success">Successful logins</option>
                <option value="login_failed">Failed logins</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="border-b border-line bg-canvas/70">
              <tr>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  When
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Customer
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Activity
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Device
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  IP
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Session
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4">
                        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.results.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <LogIn className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-ink">
                        No login activity found
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        Try a different range, activity type or search term.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.results.map((item) => {
                  const failed = item.activity_type === "login_failed";

                  return (
                    <tr
                      key={item.event_id}
                      className="transition-colors hover:bg-canvas/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                          <div>
                            <p className="text-xs font-semibold text-ink">
                              {formatDate(item.occurred_at)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ink-faint">
                              Server recorded
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {item.customer_id ? (
                          <Link
                            href={`/customers/${item.customer_id}`}
                            className="flex min-w-[250px] items-center gap-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10.5px] font-semibold text-brand-700">
                              {customerInitials(item)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink hover:text-brand-700">
                                {item.customer_name || "Unnamed customer"}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-ink-faint">
                                {item.customer_email ||
                                  item.customer_phone ||
                                  `Customer #${item.customer_id}`}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex min-w-[250px] items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                Unmatched login attempt
                              </p>
                              <p className="mt-0.5 text-xs text-ink-faint">
                                Identifier intentionally not retained
                              </p>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <ActivityPill type={item.activity_type} />
                        {failed && item.reason ? (
                          <p className="mt-1 text-[11px] text-ink-faint">
                            Reason: {item.reason}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <MonitorDot className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink-soft">
                              {item.device || "Unknown device"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ink-faint">
                              {item.browser || "Unknown browser"} ·{" "}
                              {item.os || "Unknown OS"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-ink-soft">
                          {item.ip_address || "Not recorded"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[190px] truncate font-mono text-[10.5px] text-ink-faint">
                          {item.session_id || "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-ink-faint">
            {data?.count
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  data.count
                )} of ${data.count.toLocaleString("en-IN")} events`
              : "No login events"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!data?.previous || loading || page <= 1}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <span className="min-w-20 text-center text-xs font-medium text-ink-soft">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!data?.next || loading || page >= totalPages}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4 text-xs leading-5 text-brand-900">
        Successful logins are linked to the customer account. Failed login
        attempts intentionally do not expose or reconstruct the attempted
        email/phone; only safe audit context such as time, IP, device and
        reason is shown.
      </div>
    </div>
  );
}
