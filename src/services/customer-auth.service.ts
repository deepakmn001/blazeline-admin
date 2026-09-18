import api from "@/lib/api";
import type { AdminCustomer } from "@/services/customer.service";

export type CustomerAuthSession = {
  session_id: string;
  created_at: string;
  last_activity_at: string;
  logged_out_at: string | null;
  expires_at: string;
  is_active: boolean;
  revoked_at: string | null;
  revocation_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  is_online: boolean;
  is_current: boolean;
};

export type CustomerAuthEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  metadata: Record<string, unknown>;
};

export interface CustomerAuthAuditResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  customer: AdminCustomer;
  kind: "sessions" | "events";
}

export async function getAdminCustomerAuthSessions(
  customerId: number,
  options: { active?: boolean; page?: number; page_size?: number } = {}
): Promise<CustomerAuthAuditResponse<CustomerAuthSession>> {
  const { data } =
    await api.get<CustomerAuthAuditResponse<CustomerAuthSession>>(
      `/auth/admin/customers/${customerId}/auth/`,
      {
        params: {
          kind: "sessions",
          page_size: options.page_size ?? 50,
          page: options.page ?? 1,
          ...(options.active === undefined
            ? {}
            : { active: options.active }),
        },
      }
    );

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results) ? data.results : [],
    customer: data.customer,
    kind: "sessions",
  };
}

export async function getAdminCustomerAuthEvents(
  customerId: number,
  options: { page?: number; page_size?: number } = {}
): Promise<CustomerAuthAuditResponse<CustomerAuthEvent>> {
  const { data } =
    await api.get<CustomerAuthAuditResponse<CustomerAuthEvent>>(
      `/auth/admin/customers/${customerId}/auth/`,
      {
        params: {
          kind: "events",
          page_size: options.page_size ?? 50,
          page: options.page ?? 1,
        },
      }
    );

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results) ? data.results : [],
    customer: data.customer,
    kind: "events",
  };
}

export async function revokeAdminCustomerSession(
  customerId: number,
  sessionId: string
): Promise<{ revoked: boolean; session_id: string }> {
  const { data } = await api.post<{ revoked: boolean; session_id: string }>(
    `/auth/admin/customers/${customerId}/sessions/${sessionId}/revoke/`
  );

  return data;
}

export async function revokeAllAdminCustomerSessions(
  customerId: number
): Promise<{ revoked_sessions: number }> {
  const { data } = await api.post<{ revoked_sessions: number }>(
    `/auth/admin/customers/${customerId}/sessions/revoke-all/`
  );

  return data;
}
