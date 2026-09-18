"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Laptop2,
  Mail,
  MapPin,
  MonitorSmartphone,
  Network,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Tablet,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAdminCustomerAuthEvents,
  getAdminCustomerAuthSessions,
  revokeAdminCustomerSession,
  revokeAllAdminCustomerSessions,
  type CustomerAuthEvent,
  type CustomerAuthSession,
} from "@/services/customer-auth.service";
import type { AdminCustomer } from "@/services/customer.service";

function formatDate(value: string | null) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
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

function humanizeEventType(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventTone(eventType: string) {
  const value = eventType.toLowerCase();

  if (value.includes("failed")) {
    return "bg-red-50 text-red-700";
  }

  if (value.includes("revoked") || value.includes("expired")) {
    return "bg-amber-50 text-amber-700";
  }

  if (value.includes("success") || value.includes("registered")) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value.includes("logout")) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-brand-50 text-brand-700";
}

function deviceIcon(device: string | null) {
  const value = (device || "").toLowerCase();

  if (value.includes("mobile") || value.includes("phone")) {
    return Smartphone;
  }

  if (value.includes("tablet")) {
    return Tablet;
  }

  return Laptop2;
}

function SessionCard({
  session,
  onRevoke,
  revoking,
}: {
  session: CustomerAuthSession;
  onRevoke: (session: CustomerAuthSession) => void;
  revoking: boolean;
}) {
  const DeviceIcon = deviceIcon(session.device);

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <DeviceIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">
                {session.device || "Unknown device"}
              </p>

              {session.is_current && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-1 text-[10.5px] font-semibold text-brand-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  Current
                </span>
              )}

              {session.is_online ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10.5px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600">
                  Offline
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-ink-soft">
              {session.browser || "Unknown browser"} ·{" "}
              {session.os || "Unknown OS"}
            </p>
          </div>
        </div>

        <div
          className={
            session.is_active
              ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
              : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          }
        >
          {session.is_active ? "Active session" : "Inactive session"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
            IP Address
          </p>
          <p className="mt-1.5 break-all text-xs font-medium text-ink-soft">
            {session.ip_address || "Not recorded"}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
            Created
          </p>
          <p className="mt-1.5 text-xs font-medium text-ink-soft">
            {formatDate(session.created_at)}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
            Last Active
          </p>
          <p className="mt-1.5 text-xs font-medium text-ink-soft">
            {formatDate(session.last_activity_at)}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
            Expires
          </p>
          <p className="mt-1.5 text-xs font-medium text-ink-soft">
            {formatDate(session.expires_at)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="break-all text-xs text-ink-faint">
          Session ID: {session.session_id}
        </div>

        <button
          type="button"
          onClick={() => onRevoke(session)}
          disabled={revoking}
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <ShieldOff className={`h-3.5 w-3.5 ${revoking ? "animate-pulse" : ""}`} />
          {revoking ? "Revoking…" : "Revoke session"}
        </button>
      </div>

      {!session.is_active && session.revocation_reason && (
        <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          Revocation reason:{" "}
          <span className="font-semibold">{session.revocation_reason}</span>
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: CustomerAuthEvent }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${eventTone(
              event.event_type
            )}`}
          >
            {humanizeEventType(event.event_type)}
          </span>

          <span className="text-xs text-ink-faint">
            {formatDate(event.occurred_at)}
          </span>
        </div>

        <div className="mt-2 grid gap-2 text-xs text-ink-soft sm:grid-cols-2 xl:grid-cols-4">
          <span>
            Device:{" "}
            <span className="font-medium text-ink">
              {event.device || "—"}
            </span>
          </span>
          <span>
            Browser:{" "}
            <span className="font-medium text-ink">
              {event.browser || "—"}
            </span>
          </span>
          <span>
            OS:{" "}
            <span className="font-medium text-ink">
              {event.os || "—"}
            </span>
          </span>
          <span>
            IP:{" "}
            <span className="font-medium text-ink">
              {event.ip_address || "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerSecurityPage() {
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);

  const [customer, setCustomer] = React.useState<AdminCustomer | null>(null);
  const [sessions, setSessions] = React.useState<CustomerAuthSession[]>([]);
  const [events, setEvents] = React.useState<CustomerAuthEvent[]>([]);
  const [sessionCount, setSessionCount] = React.useState(0);
  const [eventCount, setEventCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [revokingSessionId, setRevokingSessionId] = React.useState<string | null>(null);
  const [revokingAll, setRevokingAll] = React.useState(false);

  const loadSecurityData = React.useCallback(
    async (silent = false) => {
      if (!Number.isInteger(customerId) || customerId <= 0) {
        toast.error("Invalid customer ID.");
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [sessionResponse, eventResponse] = await Promise.all([
          getAdminCustomerAuthSessions(customerId, {
            active: true,
            page_size: 100,
          }),
          getAdminCustomerAuthEvents(customerId),
        ]);

        setCustomer(sessionResponse.customer);
        setSessions(sessionResponse.results);
        setEvents(eventResponse.results);
        setSessionCount(sessionResponse.count);
        setEventCount(eventResponse.count);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load customer security data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customerId]
  );

  React.useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  const activeSessions = sessions;
  const onlineSessions = sessions.filter((session) => session.is_online);

  const handleRevokeSession = async (session: CustomerAuthSession) => {
    const device = session.device || "this device";
    const ip = session.ip_address ? `\nIP: ${session.ip_address}` : "";

    if (
      !window.confirm(
        `Revoke authentication session for ${device}?${ip}\n\nThe customer will be signed out from that session.`
      )
    ) {
      return;
    }

    setRevokingSessionId(session.session_id);

    try {
      await revokeAdminCustomerSession(customerId, session.session_id);
      toast.success("Authentication session revoked.");
      await loadSecurityData(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to revoke the authentication session.");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (activeSessions.length === 0) return;

    if (
      !window.confirm(
        `Revoke all ${activeSessions.length} active authentication session${
          activeSessions.length === 1 ? "" : "s"
        } for this customer?\n\nThis will sign the customer out from every active device.`
      )
    ) {
      return;
    }

    setRevokingAll(true);

    try {
      const response = await revokeAllAdminCustomerSessions(customerId);
      toast.success(
        response.revoked_sessions === 1
          ? "1 authentication session revoked."
          : `${response.revoked_sessions} authentication sessions revoked.`
      );
      await loadSecurityData(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to revoke customer sessions.");
    } finally {
      setRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
        <div className="h-52 animate-pulse rounded-2xl bg-white" />
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-5">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>

        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <p className="text-sm font-semibold text-ink">
            Customer could not be loaded
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            The customer record or its security data was unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/customers"
            className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to customers
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {initials(customer)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">
                  {customer.full_name?.trim() || "Unnamed customer"}
                </h1>

                <span
                  className={
                    customer.is_active
                      ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700"
                      : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600"
                  }
                >
                  <span
                    className={
                      customer.is_active
                        ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                        : "h-1.5 w-1.5 rounded-full bg-slate-400"
                    }
                  />
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-1 text-sm text-ink-soft">
                Customer #{customer.id}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSecurityData(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
            <UserRound className="h-3.5 w-3.5" />
            Customer Overview
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-ink-faint" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Email
                </p>
                <p className="mt-1 truncate text-sm text-ink">
                  {customer.email || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-ink-faint" />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Phone
                </p>
                <p className="mt-1 text-sm text-ink">
                  {customer.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-ink-faint" />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Email Verification
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {customer.is_email_verified ? "Verified" : "Unverified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-ink-faint" />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Phone Verification
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {customer.is_phone_verified ? "Verified" : "Unverified"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Clock3 className="h-4 w-4 text-ink-faint" />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Joined
                </p>
                <p className="mt-1 text-sm text-ink">
                  {formatDate(customer.date_joined)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Network className="h-4 w-4 text-ink-faint" />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Last Auth Activity
                </p>
                <p className="mt-1 text-sm text-ink">
                  {formatDate(customer.last_auth_activity)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              Active Sessions
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">
              {activeSessions.length}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {sessionCount} session records returned
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              Online Sessions
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">
              {onlineSessions.length}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Based on backend online state
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              Security Events
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">
              {eventCount}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Recorded by the auth audit service
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-ink">
              <MonitorSmartphone className="h-5 w-5 text-brand-600" />
              Active Sessions
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Server-authoritative authentication sessions currently active for this customer.
            </p>
          </div>

          {activeSessions.length > 0 && (
            <button
              type="button"
              onClick={() => void handleRevokeAll()}
              disabled={revokingAll || revokingSessionId !== null}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldOff className={`h-3.5 w-3.5 ${revokingAll ? "animate-pulse" : ""}`} />
              {revokingAll ? "Revoking all…" : "Revoke all sessions"}
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center">
            <p className="text-sm font-semibold text-ink">
              No active sessions
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              This customer currently has no active authentication sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                onRevoke={handleRevokeSession}
                revoking={revokingSessionId === session.session_id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            Security History
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Authentication events recorded by the backend audit service.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-ink">
              No security history
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              No authentication events were returned for this customer.
            </p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <EventRow key={event.event_id} event={event} />
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4 text-xs text-brand-900">
        Security state shown here is read from the server. The Admin UI does
        not derive session validity, online state, expiry, or authentication
        history locally.
      </div>
    </div>
  );
}
