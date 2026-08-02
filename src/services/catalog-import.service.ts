import { unstable_cache } from "next/cache";

import api from "@/lib/api";

/* ==========================================================
   Catalog Imports
========================================================== */

export interface CatalogImport {
  id: number;
  pdf: string;
  brand: string;
  category: number;
  status: string;
  created_at: string;
}

export interface CatalogImportPayload {
  pdf: File;
  brand?: string;
  category: number;
}

export interface CatalogImportQuery {
  page?: number;
}

export interface CatalogImportListResponse {
  catalogs: CatalogImport[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function getCatalogImports(
  query?: CatalogImportQuery
): Promise<CatalogImportListResponse> {
  const { data } = await api.get("/catalog-imports/", {
    params: query,
  });

  return {
    catalogs: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function uploadCatalog(
  payload: CatalogImportPayload
) {
  const formData = new FormData();

  formData.append("pdf", payload.pdf);
  formData.append("category", String(payload.category));

  if (payload.brand) {
    formData.append("brand", payload.brand);
  }

  const { data } = await api.post(
    "/catalog-import/upload/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function getCatalogImport(id: number) {
  const { data } = await api.get(
    `/catalog-imports/${id}/`
  );

  return data;
}

export async function deleteCatalogImport(id: number) {
  await api.delete(
    `/catalog-imports/${id}/`
  );
}

/* ==========================================================
   Parsed Products (Catalog Review)
========================================================== */

export interface ParsedProduct {
  id: number;
  catalog: number;

  page_number: number;

  sku: string;

  product_name: string;

  standard_price: number | null;

  gd_price: number | null;

  rgd_price: number | null;

  mb_price: number | null;

  finish: string;

  category: string;

  subcategory: string;

  variant: string;

  collection: string;

  series: string;

  raw_text: string;

  image: string | null;

  is_imported: boolean;

  status: string;

  error_message: string;

  flagged_for_review: boolean;

  review_reasons: string[];

  created_at: string;
}

/** Sort keys exposed in the toolbar. Maps 1:1 to DRF `ordering` values. */
export type ParsedProductOrdering =
  | "-created_at"
  | "created_at"
  | "sku"
  | "-sku"
  | "product_name"
  | "-product_name"
  | "standard_price"
  | "-standard_price"
  | "gd_price"
  | "-gd_price"
  | "rgd_price"
  | "-rgd_price"
  | "mb_price"
  | "-mb_price"
  | "page_number"
  | "-page_number";

export interface ParsedProductQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  category?: string;
  finish?: string;
  is_imported?: boolean;
  ordering?: ParsedProductOrdering | string;
  catalog?: number;
}

export interface ParsedProductListResponse {
  products: ParsedProduct[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ParsedProductStats {
  pending: number;
  valid: number;
  invalid: number;
  imported: number;
  total: number;
}

export interface ParsedProductFacets {
  categories: string[];
  finishes: string[];
}

export type BulkActionType =
  | "publish"
  | "delete"
  | "mark_valid"
  | "mark_invalid";

export interface BulkActionResponse {
  success: boolean;
  action?: BulkActionType;
  ids?: number[];
  updated?: number;
  deleted?: number;
  published?: number;
  failed?: {
    id: number;
    sku: string;
    error: string;
  }[];
  error?: string;
}

/** Strips undefined/null/empty-string values so they never get sent as
 *  literal "undefined" query params. */
function cleanQuery<T extends object>(
  query?: T
): Partial<T> | undefined {
  if (!query) return undefined;

  const entries = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  return Object.fromEntries(entries) as Partial<T>;
}

export async function getParsedProducts(query?: ParsedProductQuery) {
  const { data } = await api.get("/parsed-products/", {
    params: cleanQuery(query),
  });

  return {
    products: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function getParsedProductsStats(
  query?: Pick<ParsedProductQuery, "search" | "status" | "category" | "finish" | "is_imported" | "catalog">
): Promise<ParsedProductStats> {
  const { data } = await api.get("/parsed-products/stats/", {
    params: cleanQuery(query),
  });

  return {
    pending: data.pending ?? 0,
    valid: data.valid ?? 0,
    invalid: data.invalid ?? 0,
    imported: data.imported ?? 0,
    total: data.total ?? 0,
  };
}

/**
 * Facets (category/finish filter options) barely change — they're driven by
 * the fixed product taxonomy, not by individual parsed rows. Cached via
 * Next.js data cache for 1hr so repeated page renders don't re-hit the API.
 * Call `revalidateFacetsCache()` after anything that could add a brand-new
 * category/finish value (e.g. a fresh catalog import) if you need it fresh
 * sooner than the 1hr window.
 */
const getCachedParsedProductFacets = unstable_cache(
  async (): Promise<ParsedProductFacets> => {
    const { data } = await api.get("/parsed-products/facets/");

    return {
      categories: data.categories ?? [],
      finishes: data.finishes ?? [],
    };
  },
  ["parsed-product-facets"],
  { revalidate: 3600, tags: ["parsed-product-facets"] }
);

export async function getParsedProductFacets(): Promise<ParsedProductFacets> {
  return getCachedParsedProductFacets();
}

export interface ParsedProductDashboardResponse {
  products: ParsedProduct[];
  count: number;
  next: string | null;
  previous: string | null;
  stats: ParsedProductStats;
  facets: ParsedProductFacets;
}

/**
 * Single round trip for the review page: products + count + stats + facets,
 * replacing the 3 separate calls (getParsedProducts / getParsedProductsStats
 * / getParsedProductFacets) previously fired in parallel on every render.
 * Facets here are computed fresh per request server-side (cheap distinct
 * query) rather than going through the getParsedProductFacets 1hr cache —
 * fine trade-off for one less round trip.
 */
export async function getParsedProductsDashboard(
  query?: ParsedProductQuery,
  authHeaders?: Record<string, string>
): Promise<ParsedProductDashboardResponse> {
  const { data } = await api.get("/parsed-products/dashboard/", {
    params: cleanQuery(query),
    headers: authHeaders,
  });

  return {
    products: data.products ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    stats: {
      pending: data.stats?.pending ?? 0,
      valid: data.stats?.valid ?? 0,
      invalid: data.stats?.invalid ?? 0,
      imported: data.stats?.imported ?? 0,
      total: data.stats?.total ?? 0,
    },
    facets: {
      categories: data.facets?.categories ?? [],
      finishes: data.facets?.finishes ?? [],
    },
  };
}

export async function getParsedProduct(id: number): Promise<ParsedProduct> {
  const { data } = await api.get(`/parsed-products/${id}/`);
  return data;
}

export async function updateParsedProduct(
  id: number,
  payload: Partial<ParsedProduct>
): Promise<ParsedProduct> {
  const { data } = await api.patch(`/parsed-products/${id}/`, payload);
  return data;
}

export async function deleteParsedProduct(id: number): Promise<void> {
  await api.delete(`/parsed-products/${id}/`);
}

export async function publishParsedProduct(
  id: number
): Promise<{ success: boolean; product: ParsedProduct }> {
  const { data } = await api.post(`/parsed-products/${id}/publish/`);
  return data;
}

export async function bulkParsedProductAction(
  action: BulkActionType,
  ids: Array<number | string>
): Promise<BulkActionResponse> {
  const { data } = await api.post("/parsed-products/bulk_action/", {
    action,
    ids,
  });
  return data;
}

export async function exportParsedProductsCsv(
  ids?: Array<number | string>
): Promise<Blob> {
  const { data } = await api.post(
    "/parsed-products/export_csv/",
    { ids: ids ?? [] },
    { responseType: "blob" }
  );
  return data;
}

/** Triggers a browser download for a CSV blob returned by
 *  exportParsedProductsCsv — kept here so callers don't reimplement it. */
export function downloadCsvBlob(blob: Blob, filename = "parsed_products_export.csv") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}