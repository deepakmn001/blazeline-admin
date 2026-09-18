
"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  History,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addConsultationNote,
  addQuoteNote,
  assignConsultation,
  assignQuote,
  getConsultation,
  getConsultationActivity,
  getConsultationOverview,
  getConsultations,
  getCRMStaff,
  getQuote,
  getQuoteActivity,
  getQuoteOverview,
  getQuotes,
  markConsultationContacted,
  markQuoteContacted,
  scheduleConsultation,
  sendConsultationMessage,
  sendQuoteMessage,
  setConsultationFollowUp,
  setQuoteFollowUp,
  updateConsultationStatus,
  updateQuoteStatus,
  type CRMActivity,
  type CRMType,
  type Consultation,
  type ConsultationOverview,
  type QuoteOverview,
  type QuoteRequest,
  type StaffMember,
} from "@/services/crm.service";

const CONSULTATION_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contact_pending", label: "Contact pending" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

const QUOTE_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const CONSULTATION_SERVICES = [
  "",
  "Complete Home Interiors",
  "Modular Kitchen",
  "Living Room",
  "Bedroom & Wardrobes",
  "Bathroom Interiors",
  "Office Interiors",
  "Retail / Commercial Interiors",
  "Renovation",
  "Material Consultation",
  "Custom Requirement",
];

const QUOTE_SOURCES = ["", "website", "product_page"];

function displayName(person?: StaffMember | null) {
  if (!person) return "Unassigned";
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.username ||
    `Staff #${person.id}`
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function titleCaseStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "info" | "brand" | "default" {
  if (["converted", "approved", "completed"].includes(status)) return "success";
  if (["contacted", "scheduled", "quoted", "reviewing"].includes(status))
    return "info";
  if (["new", "pending", "contact_pending"].includes(status)) return "brand";
  if (["rejected", "closed"].includes(status)) return "danger";
  return "default";
}

function getErrorMessage(error: unknown) {
  const axiosError = error as {
    response?: { data?: unknown; status?: number };
    message?: string;
  };

  const payload = axiosError?.response?.data;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const firstValue = Object.values(record)[0];

    if (typeof firstValue === "string") return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string")
      return firstValue[0];
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }

  return axiosError?.message || "Something went wrong. Please try again.";
}

function attachmentLabel(attachment: Record<string, unknown>) {
  return String(
    attachment.name ??
      attachment.filename ??
      attachment.file_name ??
      attachment.original_name ??
      "Attachment",
  );
}

function attachmentUrl(attachment: Record<string, unknown>) {
  const candidate =
    attachment.url ?? attachment.file ?? attachment.file_url ?? attachment.image;
  return typeof candidate === "string" ? candidate : null;
}

function getActivityActor(activity: CRMActivity) {
  return (
    activity.actor?.full_name ||
    [activity.actor?.first_name, activity.actor?.last_name]
      .filter(Boolean)
      .join(" ") ||
    activity.actor?.username ||
    "Admin"
  );
}

export default function Page() {
  const [type, setType] = useState<CRMType>("consultation");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [secondaryFilter, setSecondaryFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [consultationOverview, setConsultationOverview] =
    useState<ConsultationOverview | null>(null);
  const [quoteOverview, setQuoteOverview] = useState<QuoteOverview | null>(
    null,
  );

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedType, setSelectedType] = useState<CRMType | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Consultation | QuoteRequest | null>(
    null,
  );
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drawerError, setDrawerError] = useState("");

  const [actionNote, setActionNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [assignedDraft, setAssignedDraft] = useState<string>("");

  const statuses = type === "consultation" ? CONSULTATION_STATUSES : QUOTE_STATUSES;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [type, debouncedSearch, status, secondaryFilter, staffFilter, overdueOnly]);

  const loadOverviewAndStaff = useCallback(async () => {
    const results = await Promise.allSettled([
      getCRMStaff(),
      getConsultationOverview(),
      getQuoteOverview(),
    ]);

    const [staffResult, consultationResult, quoteResult] = results;
    const errors: string[] = [];

    if (staffResult.status === "fulfilled") {
      setStaff(staffResult.value.results ?? []);
    } else {
      errors.push(`Staff: ${getErrorMessage(staffResult.reason)}`);
    }

    if (consultationResult.status === "fulfilled") {
      setConsultationOverview(consultationResult.value);
    } else {
      errors.push(`Consultation metrics: ${getErrorMessage(consultationResult.reason)}`);
    }

    if (quoteResult.status === "fulfilled") {
      setQuoteOverview(quoteResult.value);
    } else {
      errors.push(`Quote metrics: ${getErrorMessage(quoteResult.reason)}`);
    }

    if (errors.length === 0) {
      setError("");
    } else {
      setError(errors.join(" | "));
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setError("");

    try {
      if (type === "consultation") {
        const data = await getConsultations({
          q: debouncedSearch || undefined,
          status: status || undefined,
          service: secondaryFilter || undefined,
          assigned_to: staffFilter || undefined,
          follow_up: overdueOnly ? "overdue" : undefined,
          page,
          page_size: 25,
        });
        setConsultations(data.results ?? []);
        setTotal(data.count ?? 0);
      } else {
        const data = await getQuotes({
          q: debouncedSearch || undefined,
          status: status || undefined,
          source: secondaryFilter || undefined,
          assigned_to: staffFilter || undefined,
          follow_up: overdueOnly ? "overdue" : undefined,
          page,
          page_size: 25,
        });
        setQuotes(data.results ?? []);
        setTotal(data.count ?? 0);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setConsultations([]);
      setQuotes([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [type, debouncedSearch, status, secondaryFilter, staffFilter, overdueOnly, page]);

  useEffect(() => {
    void loadOverviewAndStaff();
  }, [loadOverviewAndStaff]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverviewAndStaff(), loadList()]);
  }, [loadList, loadOverviewAndStaff]);

  const openDetail = useCallback(
    async (itemType: CRMType, id: number) => {
      setSelectedType(itemType);
      setSelectedId(id);
      setDetailLoading(true);
      setDrawerError("");
      setActionNote("");
      setNoteDraft("");
      setFollowUpDraft("");
      setScheduleDraft("");

      try {
        if (itemType === "consultation") {
          const [consultation, activity] = await Promise.all([
            getConsultation(id),
            getConsultationActivity(id),
          ]);
          setDetail(consultation);
          setActivities(activity ?? []);
          setAssignedDraft(
            consultation.assigned_to ? String(consultation.assigned_to.id) : "",
          );
          setFollowUpDraft(toLocalDateTimeInput(consultation.next_follow_up_at));
          setScheduleDraft(toLocalDateTimeInput(consultation.scheduled_for));
        } else {
          const [quote, activity] = await Promise.all([
            getQuote(id),
            getQuoteActivity(id),
          ]);
          setDetail(quote);
          setActivities(activity ?? []);
          setAssignedDraft(quote.assigned_to ? String(quote.assigned_to.id) : "");
          setFollowUpDraft(toLocalDateTimeInput(quote.next_follow_up_at));
          setScheduleDraft("");
        }
      } catch (loadError) {
        setDrawerError(getErrorMessage(loadError));
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const closeDrawer = () => {
    setSelectedType(null);
    setSelectedId(null);
    setDetail(null);
    setActivities([]);
    setDrawerError("");
  };

  const reloadDetail = useCallback(async () => {
    if (!selectedType || selectedId === null) return;
    await openDetail(selectedType, selectedId);
    await refreshAll();
  }, [openDetail, refreshAll, selectedId, selectedType]);

  const runAction = async (
    actionKey: string,
    action: () => Promise<unknown>,
    after: () => Promise<void> = reloadDetail,
  ) => {
    setSavingAction(actionKey);
    setDrawerError("");

    try {
      await action();
      await after();
      setActionNote("");
      setNoteDraft("");
    } catch (actionError) {
      setDrawerError(getErrorMessage(actionError));
    } finally {
      setSavingAction(null);
    }
  };

  const currentRows = type === "consultation" ? consultations : quotes;
  const hasRows = currentRows.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const selectedConsultation =
    selectedType === "consultation" ? (detail as Consultation | null) : null;
  const selectedQuote =
    selectedType === "quote" ? (detail as QuoteRequest | null) : null;

  const overviewCards = useMemo(() => {
    if (type === "consultation" && consultationOverview) {
      return [
        ["Total", consultationOverview.total, "default"],
        ["New", consultationOverview.new, "brand"],
        ["Contacted", consultationOverview.contacted, "info"],
        ["Scheduled", consultationOverview.scheduled, "success"],
        ["Overdue", consultationOverview.overdue_followups, "danger"],
      ] as const;
    }

    if (type === "quote" && quoteOverview) {
      return [
        ["Total", quoteOverview.total, "default"],
        ["Pending", quoteOverview.pending, "brand"],
        ["Reviewing", quoteOverview.reviewing, "info"],
        ["Approved", quoteOverview.approved, "success"],
        ["Overdue", quoteOverview.overdue_followups, "danger"],
      ] as const;
    }

    return [
      ["Total", 0, "default"],
      ["Pending", 0, "brand"],
      ["Active", 0, "info"],
      ["Done", 0, "success"],
      ["Overdue", 0, "danger"],
    ] as const;
  }, [consultationOverview, quoteOverview, type]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-ink-faint">
            <Users className="h-4 w-4" />
            Growth / CRM
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Leads & Enquiries
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Manage interior consultations and quote requests from submission to follow-up.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => void refreshAll()} disabled={listLoading}>
          <RefreshCw className={listLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-card sm:w-fit sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setType("consultation")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            type === "consultation"
              ? "bg-ink text-white shadow-card"
              : "text-ink-soft hover:bg-black/[0.04]"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Consultations
        </button>
        <button
          type="button"
          onClick={() => setType("quote")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            type === "quote"
              ? "bg-ink text-white shadow-card"
              : "text-ink-soft hover:bg-black/[0.04]"
          }`}
        >
          <FileText className="h-4 w-4" />
          Quote Requests
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {overviewCards.map(([label, value, variant]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
              <Badge variant={variant as "default" | "brand" | "info" | "success" | "danger"}>
                {value}
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="border-b border-line p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  type === "consultation"
                    ? "Search name, phone, email, location or reference…"
                    : "Search name, company, phone, email or reference…"
                }
                className="pl-9"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {statuses.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={secondaryFilter}
              onChange={(event) => setSecondaryFilter(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {type === "consultation" ? (
                <>
                  <option value="">All services</option>
                  {CONSULTATION_SERVICES.filter(Boolean).map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">All sources</option>
                  {QUOTE_SOURCES.filter(Boolean).map((source) => (
                    <option key={source} value={source}>
                      {source === "product_page" ? "Product page" : "Website"}
                    </option>
                  ))}
                </>
              )}
            </select>

            <select
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {displayName(member)}
                </option>
              ))}
            </select>

            <Button
              variant={overdueOnly ? "default" : "secondary"}
              size="sm"
              onClick={() => setOverdueOnly((value) => !value)}
            >
              <Clock3 className="h-4 w-4" />
              Overdue
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("");
                setSecondaryFilter("");
                setStaffFilter("");
                setOverdueOnly(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left">
            <thead className="border-b border-line bg-black/[0.015]">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {listLoading
                ? Array.from({ length: 7 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-12 animate-pulse rounded-xl bg-black/[0.035]" />
                      </td>
                    </tr>
                  ))
                : hasRows
                  ? currentRows.map((item) => {
                      const isConsultation = type === "consultation";
                      const consultation = isConsultation
                        ? (item as Consultation)
                        : null;
                      const quote = !isConsultation
                        ? (item as QuoteRequest)
                        : null;
                      const reference = isConsultation
                        ? consultation?.consultation_id
                        : quote?.quote_id;
                      const requirement = isConsultation
                        ? `${consultation?.service_required || "Interior consultation"} · ${consultation?.property_location || "Location not added"}`
                        : `${quote?.project_type || "Quote request"} · ${quote?.project_location || "Location not added"}`;
                      const followUp = isConsultation
                        ? consultation?.next_follow_up_at
                        : quote?.next_follow_up_at;
                      const assigned = isConsultation
                        ? consultation?.assigned_to
                        : quote?.assigned_to;

                      return (
                        <tr
                          key={item.id}
                          className="cursor-pointer transition-colors hover:bg-black/[0.02]"
                          onClick={() =>
                            void openDetail(type, item.id)
                          }
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                {isConsultation ? (
                                  <CalendarClock className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">
                                  {item.full_name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-ink-faint">
                                  {String(reference ?? "").slice(0, 8)}…
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-ink-soft">{item.phone}</p>
                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-ink-faint">
                              {item.email}
                            </p>
                          </td>

                          <td className="max-w-[300px] px-4 py-4 align-top">
                            <p className="truncate text-sm text-ink">{requirement}</p>
                            <p className="mt-1 text-xs text-ink-faint">
                              {isConsultation
                                ? consultation?.project_stage || "Stage not specified"
                                : quote?.source || "website"}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <Badge variant={statusVariant(item.status)}>
                              {titleCaseStatus(item.status)}
                            </Badge>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-2 text-sm text-ink-soft">
                              <UserRound className="h-4 w-4 text-ink-faint" />
                              <span className="max-w-[150px] truncate">
                                {displayName(assigned)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <span
                              className={
                                followUp && new Date(followUp) < new Date()
                                  ? "text-xs font-medium text-danger"
                                  : "text-xs text-ink-soft"
                              }
                            >
                              {followUp ? formatDate(followUp) : "No follow-up"}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <p className="whitespace-nowrap text-xs text-ink-soft">
                              {formatDate(item.created_at)}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.035] text-ink-faint">
                            <Filter className="h-5 w-5" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-ink">
                            No {type === "consultation" ? "consultations" : "quote requests"} found
                          </p>
                          <p className="mt-1 text-xs leading-5 text-ink-faint">
                            Try changing the search or filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">
            Showing {hasRows ? (page - 1) * 25 + 1 : 0}–{Math.min(page * 25, total)} of{" "}
            {total}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || listLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-20 text-center text-xs font-medium text-ink-soft">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || listLoading}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {selectedId !== null && selectedType !== null ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close lead details"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />
          <aside className="relative ml-auto flex h-full w-full max-w-2xl flex-col border-l border-line bg-canvas shadow-2xl">
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="mb-2 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to leads
                </button>
                <h2 className="truncate text-lg font-semibold text-ink">
                  {detail?.full_name || "Lead details"}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {selectedType === "consultation"
                    ? (selectedConsultation?.consultation_id ?? "Consultation")
                    : (selectedQuote?.quote_id ?? "Quote request")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:bg-black/[0.03]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="space-y-4">
                  <div className="h-24 animate-pulse rounded-2xl bg-black/[0.035]" />
                  <div className="h-44 animate-pulse rounded-2xl bg-black/[0.035]" />
                  <div className="h-64 animate-pulse rounded-2xl bg-black/[0.035]" />
                </div>
              ) : drawerError ? (
                <div className="rounded-2xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger">
                  {drawerError}
                </div>
              ) : detail ? (
                <div className="space-y-5">
                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                        Status
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <Badge variant={statusVariant(detail.status)}>
                          {titleCaseStatus(detail.status)}
                        </Badge>
                        <select
                          value={detail.status}
                          disabled={savingAction === "status"}
                          onChange={(event) => {
                            const nextStatus = event.target.value;
                            void runAction(
                              "status",
                              () =>
                                selectedType === "consultation"
                                  ? updateConsultationStatus(
                                      detail.id,
                                      nextStatus,
                                      actionNote,
                                    )
                                  : updateQuoteStatus(
                                      detail.id,
                                      nextStatus,
                                      actionNote,
                                    ),
                            );
                          }}
                          className="h-9 rounded-lg border border-line bg-white px-2.5 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        >
                          {(selectedType === "consultation"
                            ? CONSULTATION_STATUSES
                            : QUOTE_STATUSES
                          )
                            .filter((option) => option.value)
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </div>
                      <textarea
                        value={actionNote}
                        onChange={(event) => setActionNote(event.target.value)}
                        placeholder="Optional status note…"
                        className="mt-3 min-h-20 w-full resize-none rounded-xl border border-line bg-white p-3 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>

                    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                        Assignment
                      </p>
                      <select
                        value={assignedDraft}
                        onChange={(event) => {
                          setAssignedDraft(event.target.value);
                          const assignedValue = event.target.value
                            ? Number(event.target.value)
                            : null;
                          void runAction(
                            "assignment",
                            () =>
                              selectedType === "consultation"
                                ? assignConsultation(detail.id, assignedValue)
                                : assignQuote(detail.id, assignedValue),
                          );
                        }}
                        disabled={savingAction === "assignment"}
                        className="mt-3 h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {displayName(member)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">Contact</p>
                        <p className="mt-1 text-xs text-ink-faint">
                          Submitted {formatDate(detail.created_at)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          void runAction(
                            "contacted",
                            () =>
                              selectedType === "consultation"
                                ? markConsultationContacted(
                                    detail.id,
                                    actionNote,
                                  )
                                : markQuoteContacted(detail.id, actionNote),
                          )
                        }
                        disabled={
                          savingAction === "contacted" ||
                          Boolean(detail.contacted_at)
                        }
                      >
                        <Check className="h-4 w-4" />
                        {detail.contacted_at ? "Contacted" : "Mark contacted"}
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <a
                        href={`tel:${detail.phone}`}
                        className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm text-ink-soft hover:bg-black/[0.02]"
                      >
                        <Phone className="h-4 w-4 text-ink-faint" />
                        {detail.phone}
                      </a>
                      <a
                        href={`mailto:${detail.email}`}
                        className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm text-ink-soft hover:bg-black/[0.02]"
                      >
                        <Mail className="h-4 w-4 text-ink-faint" />
                        <span className="truncate">{detail.email}</span>
                      </a>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                        <MessageSquare className="h-4 w-4 text-brand-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          Customer communication
                        </p>
                        <p className="mt-1 text-xs leading-5 text-ink-faint">
                          BlazeLine automatically creates a professional message from
                          the enquiry details. No customer copy needs to be written.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-line bg-canvas px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
                        <History className="h-3.5 w-3.5 text-brand-600" />
                        <span>Message generated automatically</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-ink-faint">
                        The system uses the customer name, service/project details,
                        location, budget, timeline, quantity and product context where
                        available, then sends the approved BlazeLine template.
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void runAction(
                            "message-whatsapp",
                            () =>
                              selectedType === "consultation"
                                ? sendConsultationMessage(detail.id, "whatsapp")
                                : sendQuoteMessage(detail.id, "whatsapp"),
                          )
                        }
                        disabled={
                          savingAction === "message-whatsapp" ||
                          !detail.phone
                        }
                      >
                        {savingAction === "message-whatsapp" ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Send WhatsApp
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void runAction(
                            "message-email",
                            () =>
                              selectedType === "consultation"
                                ? sendConsultationMessage(detail.id, "email")
                                : sendQuoteMessage(detail.id, "email"),
                          )
                        }
                        disabled={
                          savingAction === "message-email" ||
                          !detail.email
                        }
                      >
                        {savingAction === "message-email" ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Send Email
                      </Button>
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-ink-faint">
                      Sending records the outbound contact in the CRM activity
                      timeline and updates the lead status where applicable.
                    </p>
                  </section>

                  <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                    <p className="text-sm font-semibold text-ink">Project details</p>

                    {selectedConsultation ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {[
                          ["Property", selectedConsultation.property_type],
                          ["Service", selectedConsultation.service_required],
                          ["Size", selectedConsultation.property_size],
                          ["Stage", selectedConsultation.project_stage],
                          ["Budget", selectedConsultation.estimated_budget],
                          ["Timeline", selectedConsultation.timeline],
                          ["Design preference", selectedConsultation.design_preference],
                          ["Preferred date", formatDateOnly(selectedConsultation.preferred_consultation_date)],
                          ["Location", selectedConsultation.property_location],
                          ["Pincode", selectedConsultation.pincode],
                          ["Scheduled for", formatDate(selectedConsultation.scheduled_for)],
                          ["Last contacted", formatDate(selectedConsultation.contacted_at)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                              {label}
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              {value || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : selectedQuote ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {[
                          ["Company", selectedQuote.company],
                          ["Project type", selectedQuote.project_type],
                          ["Location", selectedQuote.project_location],
                          ["Delivery pincode", selectedQuote.delivery_pincode],
                          ["Source", selectedQuote.source],
                          ["Quantity", selectedQuote.requested_quantity],
                          ["Product", String(
                            (selectedQuote.source_product as Record<string, unknown> | null)?.name ??
                              "—",
                          )],
                          ["Variant", String(
                            (selectedQuote.source_variant as Record<string, unknown> | null)?.display_name ??
                              "—",
                          )],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                              {label}
                            </p>
                            <p className="mt-1 text-sm text-ink">
                              {value || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {selectedConsultation?.additional_message || selectedQuote?.requirements ? (
                      <div className="mt-5 rounded-xl bg-black/[0.025] p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                          Requirements / message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                          {selectedConsultation?.additional_message ||
                            selectedQuote?.requirements ||
                            "—"}
                        </p>
                      </div>
                    ) : null}

                    {"attachments" in detail && Array.isArray(detail.attachments) && detail.attachments.length ? (
                      <div className="mt-5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                          Attachments
                        </p>
                        <div className="mt-2 space-y-2">
                          {detail.attachments.map((attachment, index) => {
                            const url = attachmentUrl(attachment);
                            const label = attachmentLabel(attachment);

                            return url ? (
                              <a
                                key={`${label}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:bg-black/[0.02]"
                              >
                                <span className="flex min-w-0 items-center gap-2 text-ink-soft">
                                  <FileText className="h-4 w-4 shrink-0 text-ink-faint" />
                                  <span className="truncate">{label}</span>
                                </span>
                                <ExternalLink className="h-4 w-4 text-ink-faint" />
                              </a>
                            ) : (
                              <div
                                key={`${label}-${index}`}
                                className="rounded-xl border border-line p-3 text-sm text-ink-soft"
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-brand-600" />
                        <p className="text-sm font-semibold text-ink">Follow-up</p>
                      </div>
                      <input
                        type="datetime-local"
                        value={followUpDraft}
                        onChange={(event) => setFollowUpDraft(event.target.value)}
                        className="mt-3 h-10 w-full rounded-xl border border-line bg-white px-3 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            void runAction(
                              "follow-up",
                              () =>
                                selectedType === "consultation"
                                  ? setConsultationFollowUp(
                                      detail.id,
                                      fromLocalDateTimeInput(followUpDraft),
                                      actionNote,
                                    )
                                  : setQuoteFollowUp(
                                      detail.id,
                                      fromLocalDateTimeInput(followUpDraft),
                                      actionNote,
                                    ),
                            )
                          }
                          disabled={savingAction === "follow-up"}
                        >
                          Save follow-up
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setFollowUpDraft("");
                            void runAction(
                              "follow-up-clear",
                              () =>
                                selectedType === "consultation"
                                  ? setConsultationFollowUp(
                                      detail.id,
                                      null,
                                      actionNote,
                                    )
                                  : setQuoteFollowUp(
                                      detail.id,
                                      null,
                                      actionNote,
                                    ),
                            );
                          }}
                          disabled={savingAction === "follow-up-clear"}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {selectedConsultation ? (
                      <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-brand-600" />
                          <p className="text-sm font-semibold text-ink">
                            Schedule consultation
                          </p>
                        </div>
                        <input
                          type="datetime-local"
                          value={scheduleDraft}
                          onChange={(event) => setScheduleDraft(event.target.value)}
                          className="mt-3 h-10 w-full rounded-xl border border-line bg-white px-3 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        />
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() =>
                            void runAction(
                              "schedule",
                              () =>
                                scheduleConsultation(
                                  detail.id,
                                  fromLocalDateTimeInput(scheduleDraft) ?? "",
                                  actionNote,
                                ),
                            )
                          }
                          disabled={
                            !scheduleDraft || savingAction === "schedule"
                          }
                        >
                          Save schedule
                        </Button>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-brand-600" />
                      <p className="text-sm font-semibold text-ink">Add note</p>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Add an internal note for the team…"
                      className="mt-3 min-h-28 w-full resize-none rounded-xl border border-line bg-white p-3 text-sm outline-none placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        const note = noteDraft.trim();
                        if (!note) return;

                        void runAction(
                          "note",
                          () =>
                            selectedType === "consultation"
                              ? addConsultationNote(detail.id, note)
                              : addQuoteNote(detail.id, note),
                        );
                      }}
                      disabled={!noteDraft.trim() || savingAction === "note"}
                    >
                      Save note
                    </Button>
                  </section>

                  <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-brand-600" />
                      <p className="text-sm font-semibold text-ink">Activity timeline</p>
                    </div>

                    <div className="mt-4 space-y-4">
                      {activities.length ? (
                        activities.map((activity) => (
                          <div key={activity.id} className="relative pl-7">
                            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                              <p className="text-sm font-medium text-ink">
                                {titleCaseStatus(
                                  activity.event_type
                                    .replace(/^(status_|crm_)/, "")
                                    .replaceAll("-", "_"),
                                )}
                              </p>
                              <p className="text-[11px] text-ink-faint">
                                {formatDate(activity.occurred_at)}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-ink-faint">
                              {getActivityActor(activity)}
                              {activity.from_status || activity.to_status
                                ? ` · ${activity.from_status ? titleCaseStatus(activity.from_status) : "—"} → ${
                                    activity.to_status
                                      ? titleCaseStatus(activity.to_status)
                                      : "—"
                                  }`
                                : ""}
                            </p>
                            {activity.note ? (
                              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-black/[0.025] p-3 text-xs leading-5 text-ink-soft">
                                {activity.note}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="py-5 text-center text-xs text-ink-faint">
                          No activity recorded yet.
                        </p>
                      )}
                    </div>
                  </section>

                  {selectedConsultation?.inspiration_photo ? (
                    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">Inspiration image</p>
                        <a
                          href={selectedConsultation.inspiration_photo}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600"
                        >
                          Open full image <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-black/[0.02]">
                        <img
                          src={selectedConsultation.inspiration_photo}
                          alt="Customer inspiration"
                          className="max-h-80 w-full object-contain"
                        />
                      </div>
                    </section>
                  ) : null}

                  {selectedType === "consultation" ? (
                    <div className="rounded-2xl border border-info/20 bg-info-bg p-3 text-xs leading-5 text-info">
                      Customer preferences and project context are read-only here. Operational changes are captured through status, assignment, contact, scheduling, follow-up and notes.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {detail ? (
              <div className="border-t border-line bg-white px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedConsultation?.property_location ||
                      selectedQuote?.project_location ||
                      "Location unavailable"}
                  </span>
                  <span>Updated {formatDate(detail.updated_at)}</span>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
