import api from "@/lib/api";

export type LoginActivityType = "all" | "login_success" | "login_failed";
export type LoginActivityDays = 30 | 90;

export interface LoginActivityItem {
  event_id: string;
  activity_type: "login_success" | "login_failed";
  occurred_at: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  session_id: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  reason: string | null;
}

export interface LoginActivityResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LoginActivityItem[];
  range_days: LoginActivityDays;
  event_filter: LoginActivityType;
  summary: {
    total: number;
    successful_logins: number;
    failed_logins: number;
  };
  generated_at: string;
}

export async function getAdminLoginActivity(
  options: {
    days?: LoginActivityDays;
    event?: LoginActivityType;
    q?: string;
    page?: number;
    page_size?: number;
  } = {}
): Promise<LoginActivityResponse> {
  const { data } = await api.get<LoginActivityResponse>(
    "/auth/admin/login-activity/",
    {
      params: {
        days: options.days ?? 30,
        event: options.event ?? "all",
        q: options.q?.trim() || undefined,
        page: options.page ?? 1,
        page_size: options.page_size ?? 50,
      },
    }
  );

  return {
    ...data,
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results) ? data.results : [],
    range_days: data.range_days === 90 ? 90 : 30,
    event_filter:
      data.event_filter === "login_success" ||
      data.event_filter === "login_failed"
        ? data.event_filter
        : "all",
    summary: {
      total: data.summary?.total ?? 0,
      successful_logins: data.summary?.successful_logins ?? 0,
      failed_logins: data.summary?.failed_logins ?? 0,
    },
  };
}
