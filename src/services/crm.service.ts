
import api from "@/lib/api";

export type CRMType = "consultation" | "quote";

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type StaffMember = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
};

export type ActivityActor = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
};

export type CRMActivity = {
  id: number;
  event_type: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  metadata?: Record<string, unknown>;
  occurred_at: string;
  actor?: ActivityActor | null;
};

export type Consultation = {
  id: number;
  consultation_id: string;
  full_name: string;
  phone: string;
  email: string;
  property_type?: string;
  service_required?: string;
  property_size?: string;
  project_stage?: string;
  estimated_budget?: string;
  timeline?: string;
  design_preference?: string;
  inspiration_photo?: string | null;
  property_location?: string;
  pincode?: string;
  preferred_consultation_date?: string | null;
  scheduled_for?: string | null;
  additional_message?: string;
  status: string;
  assigned_to?: StaffMember | null;
  next_follow_up_at?: string | null;
  contacted_at?: string | null;
  completed_at?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
  customer?: unknown;
};

export type QuoteRequest = {
  id: number;
  quote_id: string;
  full_name: string;
  phone: string;
  email: string;
  company?: string;
  project_location?: string;
  delivery_pincode?: string;
  project_type?: string;
  materials?: unknown[];
  requirements?: string;
  status: string;
  assigned_to?: StaffMember | null;
  next_follow_up_at?: string | null;
  contacted_at?: string | null;
  quoted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  source?: string;
  source_product?: unknown;
  source_variant?: unknown;
  requested_quantity?: number | null;
  created_at: string;
  updated_at: string;
  attachments?: Array<Record<string, unknown>>;
};

export type ConsultationOverview = {
  total: number;
  new: number;
  contact_pending: number;
  contacted: number;
  scheduled: number;
  completed: number;
  converted: number;
  closed: number;
  overdue_followups: number;
  generated_at?: string;
};

export type QuoteOverview = {
  total: number;
  pending: number;
  reviewing: number;
  quoted: number;
  approved: number;
  rejected: number;
  overdue_followups: number;
  generated_at?: string;
};

export type ListParams = {
  q?: string;
  status?: string;
  service?: string;
  property_type?: string;
  project_type?: string;
  source?: string;
  assigned_to?: string;
  follow_up?: "overdue";
  page?: number;
  page_size?: number;
  ordering?: string;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });

  return search.toString();
};

const asData = <T,>(response: { data: T }) => response.data;

export async function getCRMStaff() {
  const response = await api.get<{ count: number; results: StaffMember[] }>(
    "/admin/crm/staff/",
  );
  return asData(response);
}

export async function getConsultationOverview() {
  const response = await api.get<ConsultationOverview>(
    "/admin/interior-consultations/overview/",
  );
  return asData(response);
}

export async function getQuoteOverview() {
  const response = await api.get<QuoteOverview>(
    "/admin/quote-requests/overview/",
  );
  return asData(response);
}

export async function getConsultations(params: ListParams = {}) {
  const query = buildQuery({
    q: params.q,
    status: params.status,
    service: params.service,
    property_type: params.property_type,
    assigned_to: params.assigned_to,
    follow_up: params.follow_up,
    page: params.page,
    page_size: params.page_size ?? 25,
    ordering: params.ordering ?? "-created_at",
  });

  const response = await api.get<Paginated<Consultation>>(
    `/admin/interior-consultations/${query ? `?${query}` : ""}`,
  );

  return asData(response);
}

export async function getQuotes(params: ListParams = {}) {
  const query = buildQuery({
    q: params.q,
    status: params.status,
    project_type: params.project_type,
    source: params.source,
    assigned_to: params.assigned_to,
    follow_up: params.follow_up,
    page: params.page,
    page_size: params.page_size ?? 25,
    ordering: params.ordering ?? "-created_at",
  });

  const response = await api.get<Paginated<QuoteRequest>>(
    `/admin/quote-requests/${query ? `?${query}` : ""}`,
  );

  return asData(response);
}

export async function getConsultation(id: number) {
  const response = await api.get<Consultation>(
    `/admin/interior-consultations/${id}/`,
  );
  return asData(response);
}

export async function getQuote(id: number) {
  const response = await api.get<QuoteRequest>(
    `/admin/quote-requests/${id}/`,
  );
  return asData(response);
}

export async function getConsultationActivity(id: number) {
  const response = await api.get<CRMActivity[]>(
    `/admin/interior-consultations/${id}/activity/`,
  );
  return asData(response);
}

export async function getQuoteActivity(id: number) {
  const response = await api.get<CRMActivity[]>(
    `/admin/quote-requests/${id}/activity/`,
  );
  return asData(response);
}

export async function updateConsultationStatus(
  id: number,
  status: string,
  note = "",
) {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/status/`,
    { status, note },
  );
  return asData(response);
}

export async function assignConsultation(
  id: number,
  assignedTo: number | null,
  note = "",
) {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/assign/`,
    { assigned_to: assignedTo, note },
  );
  return asData(response);
}

export async function scheduleConsultation(
  id: number,
  scheduledFor: string,
  note = "",
) {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/schedule/`,
    { scheduled_for: scheduledFor, note },
  );
  return asData(response);
}

export async function addConsultationNote(id: number, note: string) {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/note/`,
    { note },
  );
  return asData(response);
}

export async function setConsultationFollowUp(
  id: number,
  nextFollowUpAt: string | null,
  note = "",
) {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/follow-up/`,
    {
      next_follow_up_at: nextFollowUpAt,
      note,
    },
  );
  return asData(response);
}

export async function markConsultationContacted(id: number, note = "") {
  const response = await api.post<Consultation>(
    `/admin/interior-consultations/${id}/contacted/`,
    { note },
  );
  return asData(response);
}

export async function updateQuoteStatus(
  id: number,
  status: string,
  note = "",
) {
  const response = await api.post<QuoteRequest>(
    `/admin/quote-requests/${id}/status/`,
    { status, note },
  );
  return asData(response);
}

export async function assignQuote(
  id: number,
  assignedTo: number | null,
  note = "",
) {
  const response = await api.post<QuoteRequest>(
    `/admin/quote-requests/${id}/assign/`,
    { assigned_to: assignedTo, note },
  );
  return asData(response);
}

export async function addQuoteNote(id: number, note: string) {
  const response = await api.post<QuoteRequest>(
    `/admin/quote-requests/${id}/note/`,
    { note },
  );
  return asData(response);
}

export async function setQuoteFollowUp(
  id: number,
  nextFollowUpAt: string | null,
  note = "",
) {
  const response = await api.post<QuoteRequest>(
    `/admin/quote-requests/${id}/follow-up/`,
    {
      next_follow_up_at: nextFollowUpAt,
      note,
    },
  );
  return asData(response);
}

export async function markQuoteContacted(id: number, note = "") {
  const response = await api.post<QuoteRequest>(
    `/admin/quote-requests/${id}/contacted/`,
    { note },
  );
  return asData(response);
}


export async function sendConsultationMessage(
  id: number,
  channel: "whatsapp" | "email",
  subject = "",
) {
  const response = await api.post(
    `/admin/interior-consultations/${id}/message/`,
    { channel, subject },
  );
  return asData(response);
}

export async function sendQuoteMessage(
  id: number,
  channel: "whatsapp" | "email",
  subject = "",
) {
  const response = await api.post(
    `/admin/quote-requests/${id}/message/`,
    { channel, subject },
  );
  return asData(response);
}
