import api from "@/lib/api";

export interface AdminCustomer {
  id: number;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  date_joined: string;
  active_session_count: number;
  last_auth_activity: string | null;
}

export interface CustomerDirectoryQuery {
  q?: string;
  active?: boolean;
  ordering?: "joined" | "joined_oldest" | "activity" | "name";
  page?: number;
  page_size?: number;
}

export interface CustomerDirectoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminCustomer[];
}

export async function getAdminCustomers(
  query: CustomerDirectoryQuery = {}
): Promise<CustomerDirectoryResponse> {
  const { data } = await api.get<CustomerDirectoryResponse>(
    "/auth/admin/customers/",
    {
      params: {
        ...query,
        q: query.q?.trim() || undefined,
      },
    }
  );

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results) ? data.results : [],
  };
}
