import api from "@/lib/api";
import { ProductPayload, Product } from "@/types/catalog";

export interface ProductQuery {
  page?: number;
  search?: string;
  category?: number;
  subcategory?: number;
  status?: string;

  ordering?: string;
}

export interface ProductListResponse {
  products: Product[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await api.post("/products/", payload);
  return data;
}

export async function getProducts(
  query?: ProductQuery
): Promise<ProductListResponse> {
  const { data } = await api.get("/products/", {
    params: query,
  });

  return {
    products: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function getProduct(slug: string) {
  const { data } = await api.get(`/products/${slug}/`);
  return data;
}

export async function updateProduct(
  slug: string,
  payload: ProductPayload
) {
  const { data } = await api.put(`/products/${slug}/`, payload);
  return data;
}

export async function deleteProduct(slug: string) {
  await api.delete(`/products/${slug}/`);
}
export async function bulkDeleteProducts(ids: number[]): Promise<void> {
  await api.post("/products/bulk-delete/", { product_ids: ids });
}

export async function bulkMoveProducts(
  ids: number[],
  category: number,
  subcategory: number
): Promise<void> {
  await api.post("/products/bulk-move/", {
    product_ids: ids,
    category,
    subcategory,
  });
}