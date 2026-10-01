import api from "@/lib/api";

export interface DirectOrderCustomerInput {
  full_name: string;
  phone?: string;
  email?: string;
}

export interface DirectOrderShippingInput {
  full_name: string;
  phone: string;
  email: string;
  company?: string;
  gstin?: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface DirectOrderItemInput {
  product_name: string;
  sku?: string;
  variant_name?: string;
  quantity: number;
  rate: string;
  discount_percent?: string;
  tax_rate?: string;
}

export interface CreateDirectOrderRequest {
  customer: DirectOrderCustomerInput;
  shipping: DirectOrderShippingInput;
  items: DirectOrderItemInput[];
  delivery_charge?: string;
  currency?: string;
  notes?: string;
}

export interface DirectOrderItem {
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
  weight: string;
}

export interface DirectOrderPayment {
  id: number;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  provider_order_id: string;
  provider_payment_id: string;
  failure_code: string;
  failure_message: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  failed_at: string | null;
}

export interface DirectOrder {
  id: number;
  order_number: string;
  source: string;
  status: string;
  payment_status: string;
  payment_method: string;
  currency: string;

  subtotal: string;
  discount_amount: string;
  delivery_charge: string;
  tax_amount: string;
  cod_fee: string;
  grand_total: string;

  shipping_full_name: string;
  shipping_phone: string;
  shipping_email: string;
  shipping_company: string;
  shipping_gstin: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_landmark: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;

  delivery_zone_id: number | null;
  delivery_zone_name: string;
  delivery_breakdown: unknown[];

  notes: string;

  created_at: string;
  updated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  delivered_at: string | null;

  items: DirectOrderItem[];
  payments: DirectOrderPayment[];
}

export interface PaymentLink {
  id: string;
  provider: string;
  provider_link_id: string;
  reference_id: string;
  short_url: string;
  amount: string;
  currency: string;
  status: string;
  expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectOrderResponse {
  success: boolean;
  order: DirectOrder;
  payment_link: PaymentLink | null;
}

export interface CreatePaymentLinkResponse {
  success: boolean;
  order_number: string;
  payment_link: PaymentLink;
}

export interface DirectOrderListItem {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  currency: string;
  grand_total: string;

  customer: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };

  item_count: number;
  payment_link: PaymentLink | null;

  created_at: string;
  paid_at: string | null;
}

export interface DirectOrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DirectOrderListItem[];
}

function createIdempotencyKey(): string {
  return `direct-order-${crypto.randomUUID()}`;
}

export async function createDirectOrder(
  payload: CreateDirectOrderRequest,
  idempotencyKey?: string
): Promise<CreateDirectOrderResponse> {
  const key = idempotencyKey || createIdempotencyKey();

  const { data } = await api.post<CreateDirectOrderResponse>(
    "/orders/direct-orders/create/",
    payload,
    {
      headers: {
        "Idempotency-Key": key,
      },
    }
  );

  return data;
}

export async function createDirectOrderPaymentLink(
  orderNumber: string
): Promise<CreatePaymentLinkResponse> {
  const { data } = await api.post<CreatePaymentLinkResponse>(
    `/orders/direct-orders/${encodeURIComponent(orderNumber)}/payment-link/`
  );

  return data;
}

export async function getDirectOrders(
  params: {
    page?: number;
    page_size?: number;
    q?: string;
  } = {}
): Promise<DirectOrderListResponse> {
  const { data } = await api.get<DirectOrderListResponse>(
    "/orders/direct-orders/",
    {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 25,
        q: params.q?.trim() || undefined,
      },
    }
  );

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results)
      ? data.results
      : [],
  };
}

export async function getDirectOrder(
  orderNumber: string
): Promise<{
  order: DirectOrder;
  payment_link: PaymentLink | null;
}> {
  const { data } = await api.get<{
    order: DirectOrder;
    payment_link: PaymentLink | null;
  }>(
    `/orders/direct-orders/${encodeURIComponent(orderNumber)}/`
  );

  return data;
}