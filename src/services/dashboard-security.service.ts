import api from "@/lib/api";

export interface DashboardSecuritySummary {
  customers: {
    total: number;
    active: number;
  };
  auth: {
    active_sessions: number;
    online_sessions: number;
    online_customers: number;
    failed_logins_24h: number;
    sessions_revoked_24h: number;
  };
  generated_at: string;
}

export async function getDashboardSecuritySummary(): Promise<DashboardSecuritySummary> {
  const { data } = await api.get<DashboardSecuritySummary>(
    "/auth/admin/security-summary/"
  );

  return {
    customers: {
      total: data.customers?.total ?? 0,
      active: data.customers?.active ?? 0,
    },
    auth: {
      active_sessions: data.auth?.active_sessions ?? 0,
      online_sessions: data.auth?.online_sessions ?? 0,
      online_customers: data.auth?.online_customers ?? 0,
      failed_logins_24h: data.auth?.failed_logins_24h ?? 0,
      sessions_revoked_24h: data.auth?.sessions_revoked_24h ?? 0,
    },
    generated_at: data.generated_at,
  };
}
