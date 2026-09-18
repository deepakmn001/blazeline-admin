"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
   LogIn,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAdminCustomers,
  type AdminCustomer,
  type CustomerDirectoryQuery,
} from "@/services/customer.service";

type ActiveFilter = "all" | "active" | "inactive";
type Ordering =
  | "joined"
  | "joined_oldest"
  | "activity"
  | "name";

const PAGE_SIZE = 25;

function formatDate(value: string | null) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatJoinedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function initials(customer: AdminCustomer) {
  const source =
    customer.full_name?.trim() ||
    customer.email?.trim() ||
    customer.phone?.trim() ||
    "Customer";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function StatusPill({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
      }
    >
      <span
        className={
          active
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-slate-400"
        }
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function VerificationPill({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <span
      className={
        verified
          ? "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10.5px] font-semibold text-brand-700"
          : "inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10.5px] font-medium text-slate-500"
      }
    >
      <ShieldCheck className="h-3 w-3" />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<AdminCustomer[]>([]);
  const [count, setCount] = React.useState(0);
  const [next, setNext] = React.useState<string | null>(null);
  const [previous, setPrevious] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] =
    React.useState<ActiveFilter>("all");
  const [ordering, setOrdering] =
    React.useState<Ordering>("activity");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadCustomers = React.useCallback(
    async (options?: { silent?: boolean; page?: number }) => {
      const targetPage = options?.page ?? page;

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const query: CustomerDirectoryQuery = {
          page: targetPage,
          page_size: PAGE_SIZE,
          ordering,
        };

        const normalizedSearch = search.trim();
        if (normalizedSearch) {
          query.q = normalizedSearch;
        }

        if (activeFilter === "active") {
          query.active = true;
        } else if (activeFilter === "inactive") {
          query.active = false;
        }

        const response = await getAdminCustomers(query);

        setCustomers(response.results);
        setCount(response.count);
        setNext(response.next);
        setPrevious(response.previous);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load customers.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, ordering, page, search]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const changeFilter = (value: ActiveFilter) => {
    setActiveFilter(value);
    setPage(1);
  };

  const changeOrdering = (value: Ordering) => {
    setOrdering(value);
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            <UserRound className="h-3.5 w-3.5" />
            Customer Management
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
            Manage customer accounts and inspect authoritative account
            activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
  <Link
    href="/login-activity"
    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
  >
    <LogIn className="h-4 w-4" />
    Login Activity
  </Link>

  <button
    type="button"
    onClick={() => void loadCustomers({ silent: true })}
    disabled={loading || refreshing}
    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
  >
    <RefreshCcw
      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
    />
    Refresh
  </button>
</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Total Customers
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {loading ? "—" : count.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Verified on Current Page
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {loading
              ? "—"
              : customers.filter(
                  (customer) =>
                    customer.is_email_verified &&
                    customer.is_phone_verified
                ).length}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Smartphone className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Active Sessions on Page
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {loading
              ? "—"
              : customers.reduce(
                  (total, customer) =>
                    total + (customer.active_session_count || 0),
                  0
                )}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ArrowDownUp className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Showing
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {loading ? "—" : customers.length}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email or phone..."
                className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={activeFilter}
                onChange={(event) =>
                  changeFilter(event.target.value as ActiveFilter)
                }
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink-soft outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="all">All customers</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>

              <select
                value={ordering}
                onChange={(event) =>
                  changeOrdering(event.target.value as Ordering)
                }
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink-soft outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="activity">Recent activity</option>
                <option value="joined">Newest joined</option>
                <option value="joined_oldest">Oldest joined</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-line bg-canvas/70">
              <tr>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Customer
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Contact
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Verification
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Sessions
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Last Activity
                </th>
                <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {loading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-5 py-4">
                        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-ink">
                        No customers found
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        Try a different search or filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="group transition-colors hover:bg-canvas/60"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="flex min-w-[240px] items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                          {initials(customer)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">
                            {customer.full_name?.trim() || "Unnamed customer"}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            Customer #{customer.id} · Joined{" "}
                            {formatJoinedDate(customer.date_joined)}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-ink-soft">
                          <Mail className="h-3.5 w-3.5 text-ink-faint" />
                          <span className="max-w-[260px] truncate">
                            {customer.email || "No email"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-ink-soft">
                          <Phone className="h-3.5 w-3.5 text-ink-faint" />
                          <span>{customer.phone || "No phone"}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <VerificationPill
                          verified={customer.is_email_verified}
                        />
                        <VerificationPill
                          verified={customer.is_phone_verified}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-sky-50 px-2 text-xs font-semibold text-sky-700">
                          {customer.active_session_count}
                        </div>
                        <span className="text-xs text-ink-soft">
                          active
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-ink-soft">
                        {formatDate(customer.last_auth_activity)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusPill active={customer.is_active} />
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
              ? "No customers"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  count
                )} of ${count.toLocaleString("en-IN")}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!previous || page <= 1 || loading}
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
              disabled={!next || page >= totalPages || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
