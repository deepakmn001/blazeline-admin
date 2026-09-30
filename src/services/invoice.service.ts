import api from "@/lib/api";

export type InvoiceStatus =
  | "pending"
  | "generated"
  | "partially_sent"
  | "sent"
  | "failed";

export type DeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "not_applicable";

export type InvoiceItem = {
  id: number;
  product_name: string;
  sku: string;
  variant_name: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  tax_amount: string;
  discount_amount: string;
  line_total: string;
  currency: string;
};

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  order_id: number;
  order_number?: string | null;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  customer_gstin: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_landmark: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  currency: string;
  subtotal: string;
  discount_amount: string;
  delivery_charge: string;
  tax_amount: string;
  cod_fee: string;
  grand_total: string;
  payment_method: string;
  payment_status: string;
  razorpay_payment_id: string;
  pdf_url: string;
  pdf_public_id: string;
  status: InvoiceStatus;
  email_status: DeliveryStatus;
  email_sent_at: string | null;
  email_error: string;
  whatsapp_status: DeliveryStatus;
  whatsapp_sent_at: string | null;
  whatsapp_error: string;
  delivery_attempts: number;
  last_error: string;
  issued_at: string;
  updated_at: string;
  items: InvoiceItem[];
};

export type InvoiceListParams = {
  q?: string;
  status?: InvoiceStatus | "";
  payment_status?: string;
  email_status?: DeliveryStatus | "";
  whatsapp_status?: DeliveryStatus | "";
  ordering?: string;
  page?: number;
  page_size?: number;
};

export type InvoiceListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: InvoiceRecord[];
};

export type InvoiceOverview = {
  total: number;
  pending: number;
  generated: number;
  sent: number;
  failed: number;
  email_pending: number;
  email_sent: number;
  email_failed: number;
  whatsapp_pending: number;
  whatsapp_sent: number;
  whatsapp_failed: number;
  generated_at?: string;
};

function normalizeListResponse(
  data: Partial<InvoiceListResponse> | null | undefined,
): InvoiceListResponse {
  return {
    count: Number(data?.count ?? 0),
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function getAdminInvoices(
  params: InvoiceListParams = {},
): Promise<InvoiceListResponse> {
  const { data } = await api.get<InvoiceListResponse>("/admin/invoices/", {
    params: {
      ...params,
      q: params.q?.trim() || undefined,
      page_size: params.page_size ?? 25,
      ordering: params.ordering ?? "-issued_at",
    },
  });

  return normalizeListResponse(data);
}

export async function getAdminInvoiceOverview(): Promise<InvoiceOverview> {
  const { data } = await api.get<InvoiceOverview>("/admin/invoices/overview/");
  return data;
}

export async function getAdminInvoice(id: string): Promise<InvoiceRecord> {
  const { data } = await api.get<InvoiceRecord>(`/admin/invoices/${id}/`);
  return data;
}


export type SendInvoiceMode = "default" | "custom";

export type SendAdminInvoiceResponse = {
  message: string;
  mode: SendInvoiceMode;
  invoice: InvoiceRecord;
};

export async function sendAdminInvoiceEmail(
  id: string,
  options: { mode: "default" } | { mode: "custom"; file: File },
): Promise<SendAdminInvoiceResponse> {
  const formData = new FormData();
  formData.append("mode", options.mode);

  if (options.mode === "custom") {
    formData.append("file", options.file, options.file.name);
  }

  const { data } = await api.post<SendAdminInvoiceResponse>(
    `/admin/invoices/${id}/send-email/`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return data;
}
