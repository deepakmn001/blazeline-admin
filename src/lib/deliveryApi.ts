// src/lib/deliveryApi.ts
//
// Single source of truth for the Delivery Management Console: types +
// every API call. Field names mirror the backend contract exactly
// (catalog/serializers.py — DeliveryZoneSerializer, ServiceablePincodeSerializer,
// DeliveryRuleSerializer, DeliveryRuleListSerializer, DeliveryQuoteRequestSerializer,
// DeliveryQuoteResponseSerializer). No pricing logic lives here or anywhere
// on the frontend — the backend (catalog/delivery/services.py::calculate_delivery)
// is the sole source of truth for actual delivery charges.
//
// Decimal fields (amount, subtotal, weight, delivery_charge) are typed as
// `string` because Django's DecimalField is serialized to a JSON string by
// DRF, not a number. Do not coerce these to `number` here — any display
// formatting/parsing belongs in the component layer.
//
// TRANSPORT NOTE: this project's real API client is the axios instance
// exported from "@/lib/api" (JWT auto-attached via request interceptor,
// auto-refresh on 401 via response interceptor). There is no `apiFetch`
// function anywhere in this project — every call below uses `api.get`,
// `api.post`, `api.put`, `api.delete` and unwraps `{ data }`. Endpoints are
// relative to the axios instance's baseURL (NEXT_PUBLIC_API_URL, which
// already ends in `/api`), matching the production routes:
//   /api/admin/delivery/overview/
//   /api/admin/delivery/zones/
//   /api/admin/delivery/pincodes/
//   /api/admin/delivery/rules/
//   /api/delivery/quote/
//   /api/delivery/check/
//
// Errors are normal axios errors (AxiosError). `parseApiError` below uses
// `axios.isAxiosError()` to narrow them and extract DRF field errors from
// `error.response.data`.

import api from "@/lib/api";
import axios from "axios";

/* ==================================================================== */
/* TYPES                                                                  */
/* ==================================================================== */

export interface DeliveryZoneMini {
  id: number;
  name: string;
  code: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  code: string;
  active: boolean;
  priority: number;
  pincode_count: number;
  rule_count: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZonePayload {
  name: string;
  code: string;
  active: boolean;
  priority: number;
}

export interface ServiceablePincode {
  id: number;
  pincode: string;
  area_name: string;
  city: string;
  state: string;
  is_active: boolean;
  zone: DeliveryZoneMini | null;
}

export interface ServiceablePincodePayload {
  pincode: string;
  area_name: string;
  city: string;
  state: string;
  is_active: boolean;
  zone_id?: number | null;
}

export type ConditionField =
  | "cart_value" | "weight" | "quantity" | "total_quantity" | "customer_type" | "shipping_type";
export type ConditionOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "in";

export interface DeliveryRuleCondition {
  id?: number;
  field: ConditionField;
  field_display?: string;
  operator: ConditionOperator;
  operator_display?: string;
  value: string;
  sort_order: number;
}

export type ActionType = "base_charge" | "surcharge" | "discount" | "free_delivery";
export type PricingMode = "fixed" | "per_item" | "per_unit" | "per_kg" | "percentage";

export interface DeliveryRuleAction {
  id?: number;
  action_type: ActionType;
  action_type_display?: string;
  pricing_mode: PricingMode;
  pricing_mode_display?: string;
  /** Django DecimalField -> DRF serializes as a JSON string, e.g. "199.00". */
  amount: string;
  label: string;
  metadata: Record<string, unknown>;
  sort_order: number;
  active: boolean;
}

export type ComputedRuleStatus = "active" | "inactive" | "scheduled" | "expired";
export type CombineMode = "add" | "override";
export type ScopeType = "global" | "zone" | "category" | "subcategory" | "product" | "variant";

interface MiniRef {
  id: number;
  name: string;
  slug?: string;
}

export interface DeliveryRuleListItem {
  id: number;
  name: string;
  code: string;
  active: boolean;
  computed_status: ComputedRuleStatus;
  zone: DeliveryZoneMini | null;
  category: MiniRef | null;
  subcategory: MiniRef | null;
  scope: { type: ScopeType; label: string };
  priority: number;
  combine_mode: CombineMode;
  stop_after: boolean;
  starts_at: string | null;
  ends_at: string | null;
  condition_count: number;
  action_count: number;
  updated_at: string;
}

export interface DeliveryRule {
  id: number;
  name: string;
  code: string;
  active: boolean;
  computed_status: ComputedRuleStatus;
  priority: number;
  zone: DeliveryZoneMini | null;
  category: MiniRef | null;
  subcategory: MiniRef | null;
  product: MiniRef | null;
  variant: { id: number; sku: string; name?: string } | null;
  combine_mode: CombineMode;
  stop_after: boolean;
  starts_at: string | null;
  ends_at: string | null;
  conditions: DeliveryRuleCondition[];
  actions: DeliveryRuleAction[];
  specificity: number;
  created_at: string;
  updated_at: string;
}

/* ---- Nested condition/action payload types -------------------------- */
/* Create payloads must never carry a database `id` or any display-only  */
/* field. Update payloads must be able to carry the `id` of an existing  */
/* child row (the backend's nested-update logic matches on it) while     */
/* also allowing brand-new children with no `id` at all.                 */

export type DeliveryRuleConditionCreatePayload = Omit<
  DeliveryRuleCondition,
  "id" | "field_display" | "operator_display"
>;

export type DeliveryRuleConditionUpdatePayload = Omit<
  DeliveryRuleCondition,
  "field_display" | "operator_display"
>;

export type DeliveryRuleActionCreatePayload = Omit<
  DeliveryRuleAction,
  "id" | "action_type_display" | "pricing_mode_display"
>;

export type DeliveryRuleActionUpdatePayload = Omit<
  DeliveryRuleAction,
  "action_type_display" | "pricing_mode_display"
>;

interface DeliveryRuleBasePayload {
  name: string;
  code: string;
  active: boolean;
  priority: number;
  zone_id?: number | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  product_id?: number | null;
  variant_id?: number | null;
  combine_mode: CombineMode;
  stop_after: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

/** Body for POST /admin/delivery/rules/ — new rule, so no child has an id yet. */
export interface DeliveryRuleCreatePayload extends DeliveryRuleBasePayload {
  conditions: DeliveryRuleConditionCreatePayload[];
  actions: DeliveryRuleActionCreatePayload[];
}

/** Body for PUT /admin/delivery/rules/<id>/ — children may be existing (with id) or new. */
export interface DeliveryRuleUpdatePayload extends DeliveryRuleBasePayload {
  conditions: DeliveryRuleConditionUpdatePayload[];
  actions: DeliveryRuleActionUpdatePayload[];
}

/**
 * @deprecated Prefer `DeliveryRuleCreatePayload` / `DeliveryRuleUpdatePayload`.
 * Kept as an alias (the more permissive "update" shape) for callers that
 * still import the old combined payload type.
 */
export type DeliveryRulePayload = DeliveryRuleUpdatePayload;

export interface DeliveryOverview {
  zones: { active: number; inactive: number };
  pincodes: { serviceable: number; total: number };
  rules: {
    active: number; scheduled: number; expired: number; inactive: number;
    free_delivery: number; total: number;
  };
  recent_changes: { id: number; name: string; active: boolean; updated_at: string }[];
}

export interface DeliveryQuoteItem {
  variant_id: number;
  quantity: number;
}

export interface DeliveryQuoteRequest {
  pincode: string;
  items: DeliveryQuoteItem[];
}

export interface DeliveryQuoteBreakdownEntry {
  rule: string;
  label: string;
  /** Django DecimalField -> DRF serializes as a JSON string. */
  amount: string;
}

export interface DeliveryQuoteResponse {
  deliverable: boolean;
  zone: { id: number; name: string } | null;
  subtotal: string;
  weight: string;
  delivery_charge: string | null;
  free_delivery: boolean;
  breakdown: DeliveryQuoteBreakdownEntry[];
  message: string;
}

export interface PickerOption {
  id: number;
  label: string;
  sublabel?: string;
}

export interface ListResult<T> {
  items: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface PaginatedResponse<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

/** DRF field-error shape: { field: ["msg", ...] } — used by the UI to map
 *  server validation onto individual form fields. */
export type ApiFieldErrors = Record<string, string[]>;

export interface ParsedApiError {
  fields: ApiFieldErrors;
  formMessage: string | null;
}

/* ======================================================================
   RUNTIME TYPE GUARDS
   Small, local, explicit guards — no `any`, no casts.
====================================================================== */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v): v is string => isString(v));
}

/**
 * DRF validation error bodies look like:
 *   { "name": ["already exists"], "detail": "not found" }
 * i.e. every value is either a string or an array of strings.
 */
function isDrfErrorBody(value: unknown): value is Record<string, string | string[]> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (v: unknown) => isString(v) || isStringArray(v)
  );
}

function messageForStatus(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return "This record no longer exists.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Server error. Please try again shortly.";
  return "Please check the form and try again.";
}

/**
 * Normalizes whatever the axios client throws into field-level + form-level
 * messages. Never surfaces raw tracebacks/stack traces to the admin.
 */
export function parseApiError(err: unknown): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data: unknown = err.response?.data;

    if (isDrfErrorBody(data)) {
      const fields: ApiFieldErrors = {};
      let formMessage: string | null = null;
      for (const [key, value] of Object.entries(data)) {
        const messages = isStringArray(value) ? value : [value];
        if (key === "detail" || key === "non_field_errors") {
          formMessage = messages.join(" ");
        } else {
          fields[key] = messages;
        }
      }
      if (formMessage || Object.keys(fields).length > 0) {
        return { fields, formMessage };
      }
      // DRF-shaped body but nothing usable in it (e.g. `{}`) — fall through
      // to status-based messaging below.
    }

    if (typeof status === "number") {
      return { fields: {}, formMessage: messageForStatus(status) };
    }

    return { fields: {}, formMessage: "Network error. Check your connection and try again." };
  }

  if (err instanceof Error) {
    return { fields: {}, formMessage: "Something went wrong. Please try again." };
  }

  return { fields: {}, formMessage: "Something went wrong. Please try again." };
}

function toListResult<T>(data: PaginatedResponse<T> | T[]): ListResult<T> {
  if (Array.isArray(data)) {
    return { items: data, count: data.length, next: null, previous: null };
  }
  return {
    items: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

/**
 * Serializes a flat query-params object into a `?a=1&b=2` string, skipping
 * undefined/null values.
 */
function buildQueryString(params?: object): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/* ==================================================================== */
/* ZONES                                                                  */
/* ==================================================================== */

export interface ZoneQuery {
  search?: string;
  active?: boolean;
  ordering?: string;
}

export const zonesApi = {
  list: async (query?: ZoneQuery): Promise<ListResult<DeliveryZone>> => {
    const { data } = await api.get<PaginatedResponse<DeliveryZone> | DeliveryZone[]>(
      `/admin/delivery/zones/${buildQueryString(query)}`
    );
    return toListResult<DeliveryZone>(data);
  },
  create: async (payload: DeliveryZonePayload): Promise<DeliveryZone> => {
    const { data } = await api.post<DeliveryZone>("/admin/delivery/zones/", payload);
    return data;
  },
  update: async (id: number, payload: DeliveryZonePayload): Promise<DeliveryZone> => {
    const { data } = await api.put<DeliveryZone>(`/admin/delivery/zones/${id}/`, payload);
    return data;
  },
  toggleActive: async (id: number): Promise<DeliveryZone> => {
    const { data } = await api.post<DeliveryZone>(`/admin/delivery/zones/${id}/toggle-active/`);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/admin/delivery/zones/${id}/`);
  },
  search: async (query: string): Promise<PickerOption[]> => {
    const res = await zonesApi.list({ search: query });
    return res.items.map((z) => ({ id: z.id, label: z.name, sublabel: z.code }));
  },
};

/* ==================================================================== */
/* SERVICEABLE PINCODES                                                  */
/* ==================================================================== */

export interface PincodeQuery {
  search?: string;
  is_active?: boolean;
  zone?: number;
  ordering?: string;
}

export const pincodesApi = {
  list: async (query?: PincodeQuery): Promise<ListResult<ServiceablePincode>> => {
    const { data } = await api.get<PaginatedResponse<ServiceablePincode> | ServiceablePincode[]>(
      `/admin/delivery/pincodes/${buildQueryString(query)}`
    );
    return toListResult<ServiceablePincode>(data);
  },
  create: async (payload: ServiceablePincodePayload): Promise<ServiceablePincode> => {
    const { data } = await api.post<ServiceablePincode>("/admin/delivery/pincodes/", payload);
    return data;
  },
  update: async (id: number, payload: ServiceablePincodePayload): Promise<ServiceablePincode> => {
    const { data } = await api.put<ServiceablePincode>(`/admin/delivery/pincodes/${id}/`, payload);
    return data;
  },
  toggleActive: async (id: number): Promise<ServiceablePincode> => {
    const { data } = await api.post<ServiceablePincode>(`/admin/delivery/pincodes/${id}/toggle-active/`);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/admin/delivery/pincodes/${id}/`);
  },
};

/* ==================================================================== */
/* RULES                                                                  */
/* ==================================================================== */

export interface RuleQuery {
  search?: string;
  active?: boolean;
  status?: "active" | "scheduled" | "expired" | "inactive";
  scope?: ScopeType;
  zone?: number;
  category?: number;
  combine_mode?: CombineMode;
  ordering?: string;
}

export const rulesApi = {
  list: async (query?: RuleQuery): Promise<ListResult<DeliveryRuleListItem>> => {
    const { data } = await api.get<PaginatedResponse<DeliveryRuleListItem> | DeliveryRuleListItem[]>(
      `/admin/delivery/rules/${buildQueryString(query)}`
    );
    return toListResult<DeliveryRuleListItem>(data);
  },
  get: async (id: number): Promise<DeliveryRule> => {
    const { data } = await api.get<DeliveryRule>(`/admin/delivery/rules/${id}/`);
    return data;
  },
  create: async (payload: DeliveryRuleCreatePayload): Promise<DeliveryRule> => {
    const { data } = await api.post<DeliveryRule>("/admin/delivery/rules/", payload);
    return data;
  },
  update: async (id: number, payload: DeliveryRuleUpdatePayload): Promise<DeliveryRule> => {
    const { data } = await api.put<DeliveryRule>(`/admin/delivery/rules/${id}/`, payload);
    return data;
  },
  toggleActive: async (id: number): Promise<DeliveryRuleListItem> => {
    const { data } = await api.post<DeliveryRuleListItem>(`/admin/delivery/rules/${id}/toggle-active/`);
    return data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/admin/delivery/rules/${id}/`);
  },
};

/* ==================================================================== */
/* SCOPE PICKERS — reuse existing confirmed endpoints, server-side search */
/* only (never load the full catalog client-side — spec: performance).   */
/* ==================================================================== */

interface CategoryPickerRaw {
  id: number;
  name: string;
}

interface SubcategoryPickerRaw {
  id: number;
  name: string;
  category_name?: string;
}

interface ProductPickerRaw {
  id: number;
  name: string;
  category?: { name: string } | null;
}

interface VariantPickerRaw {
  id: number;
  sku: string;
  name?: string;
}

function toPickerArray<T>(data: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!data) return [];
  return toListResult<T>(data).items;
}

export const pickersApi = {
  categories: async (query: string): Promise<PickerOption[]> => {
    const { data } = await api.get<PaginatedResponse<CategoryPickerRaw> | CategoryPickerRaw[]>(
      `/categories/${buildQueryString({ search: query || undefined, active: true })}`
    );
    return toPickerArray(data).map((c) => ({ id: c.id, label: c.name }));
  },
  subcategories: async (query: string, categoryId?: number): Promise<PickerOption[]> => {
    const { data } = await api.get<PaginatedResponse<SubcategoryPickerRaw> | SubcategoryPickerRaw[]>(
      `/subcategories/${buildQueryString({ search: query || undefined, category: categoryId, active: true })}`
    );
    return toPickerArray(data).map((s) => ({
      id: s.id, label: s.name, sublabel: s.category_name,
    }));
  },
  products: async (query: string): Promise<PickerOption[]> => {
    const { data } = await api.get<PaginatedResponse<ProductPickerRaw> | ProductPickerRaw[]>(
      `/products/${buildQueryString({ search: query || undefined })}`
    );
    return toPickerArray(data).map((p) => ({
      id: p.id, label: p.name, sublabel: p.category?.name,
    }));
  },
  variants: async (query: string, productId?: number): Promise<PickerOption[]> => {
    const { data } = await api.get<PaginatedResponse<VariantPickerRaw> | VariantPickerRaw[]>(
      `/product-variants/${buildQueryString({ search: query || undefined, product: productId })}`
    );
    return toPickerArray(data).map((v) => ({
      id: v.id, label: v.sku, sublabel: v.name,
    }));
  },
};

/* ==================================================================== */
/* OVERVIEW                                                               */
/* ==================================================================== */

export async function getDeliveryOverview(): Promise<DeliveryOverview> {
  const { data } = await api.get<DeliveryOverview>("/admin/delivery/overview/");
  return data;
}

/* ==================================================================== */
/* QUOTE SIMULATOR — hits the real production quote engine. Calculated   */
/* by the backend ONLY. Never computed client-side.                      */
/* ==================================================================== */

export async function simulateDeliveryQuote(
  payload: DeliveryQuoteRequest,
  signal?: AbortSignal
): Promise<DeliveryQuoteResponse> {
  const { data } = await api.post<DeliveryQuoteResponse>("/delivery/quote/", payload, { signal });
  return data;
}

/* ==================================================================== */
/* PINCODE AVAILABILITY CHECK — lightweight serviceability check that     */
/* runs before requesting a full quote. Calculated by the backend ONLY;   */
/* never inferred client-side. Mirrors POST /api/delivery/check/.         */
/* ==================================================================== */

export interface DeliveryCheckRequest {
  pincode: string;
}

export interface DeliveryCheckResponse {
  deliverable: boolean;
  zone: { id: number; name: string } | null;
  message: string;
}

export async function checkPincodeDelivery(
  payload: DeliveryCheckRequest,
  signal?: AbortSignal
): Promise<DeliveryCheckResponse> {
  const { data } = await api.post<DeliveryCheckResponse>("/delivery/check/", payload, { signal });
  return data;
}