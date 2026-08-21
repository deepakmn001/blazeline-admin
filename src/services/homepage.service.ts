import api from "@/lib/api";

import type { Category } from "@/types/category";

export interface HomepageCategory {
  id: number;
  category: Category;
  is_active: boolean;
  sort_order: number;
}

export interface HomepageCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HomepageCategory[];
}

export interface CreateHomepageCategoryPayload {
  category: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateHomepageCategoryPayload {
  category?: number;
  is_active?: boolean;
  sort_order?: number;
}

export async function getHomepageCategories(): Promise<
  HomepageCategory[]
> {
  const { data } = await api.get<
    HomepageCategory[] | HomepageCategoryListResponse
  >("/homepage/categories/");

  if (Array.isArray(data)) {
    return data;
  }

  return data.results ?? [];
}

export async function createHomepageCategory(
  payload: CreateHomepageCategoryPayload
): Promise<HomepageCategory> {
  const { data } = await api.post<HomepageCategory>(
    "/homepage/categories/",
    payload
  );

  return data;
}

export async function updateHomepageCategory(
  id: number,
  payload: UpdateHomepageCategoryPayload
): Promise<HomepageCategory> {
  const { data } = await api.patch<HomepageCategory>(
    `/homepage/categories/${id}/`,
    payload
  );

  return data;
}

export async function deleteHomepageCategory(
  id: number
): Promise<void> {
  await api.delete(`/homepage/categories/${id}/`);
}