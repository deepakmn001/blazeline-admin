import api from "@/lib/api";

import type {
  SubCategory,
  SubCategoryFilters,
  SubCategoryListResponse,
  CreateSubCategoryPayload,
  UpdateSubCategoryPayload,
} from "@/types/subcategory";

interface SubCategoryServiceResponse {
  subcategories: SubCategory[];
  count: number;
  next: string | null;
  previous: string | null;
}

function normalizeList(
  data: SubCategory[] | SubCategoryListResponse
): SubCategoryServiceResponse {
  if (Array.isArray(data)) {
    return {
      subcategories: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  return {
    subcategories: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function getSubCategories(
  filters?: SubCategoryFilters
): Promise<SubCategoryServiceResponse> {
  const { data } = await api.get<
    SubCategory[] | SubCategoryListResponse
  >("/subcategories/", {
    params: filters,
  });

  return normalizeList(data);
}

export async function getSubCategory(
  id: number
): Promise<SubCategory> {
  const { data } = await api.get<SubCategory>(
    `/subcategories/${id}/`
  );

  return data;
}

export async function createSubCategory(
  payload: CreateSubCategoryPayload
): Promise<SubCategory> {
  const formData = new FormData();

  formData.append("category", String(payload.category));
  formData.append("name", payload.name);
  formData.append("slug", payload.slug);
  formData.append("description", payload.description);
  formData.append("icon", payload.icon ?? "");
  formData.append("featured", String(payload.featured));
  formData.append("active", String(payload.active));
  formData.append("sort_order", String(payload.sort_order));

  if (payload.image instanceof File) {
    formData.append("image", payload.image);
  }

  const { data } = await api.post<SubCategory>(
    "/subcategories/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function updateSubCategory(
  id: number,
  payload: UpdateSubCategoryPayload
): Promise<SubCategory> {
  const formData = new FormData();

  if (payload.category !== undefined) {
    formData.append("category", String(payload.category));
  }

  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }

  if (payload.slug !== undefined) {
    formData.append("slug", payload.slug);
  }

  if (payload.description !== undefined) {
    formData.append("description", payload.description);
  }

  if (payload.icon !== undefined) {
    formData.append("icon", payload.icon ?? "");
  }

  if (payload.featured !== undefined) {
    formData.append("featured", String(payload.featured));
  }

  if (payload.active !== undefined) {
    formData.append("active", String(payload.active));
  }

  if (payload.sort_order !== undefined) {
    formData.append(
      "sort_order",
      String(payload.sort_order)
    );
  }

  if (payload.image instanceof File) {
    formData.append("image", payload.image);
  }

  const { data } = await api.patch<SubCategory>(
    `/subcategories/${id}/`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function deleteSubCategory(
  id: number
): Promise<void> {
  await api.delete(`/subcategories/${id}/`);
}

export async function toggleSubCategoryStatus(
  id: number,
  active: boolean
): Promise<SubCategory> {
  const { data } = await api.patch<SubCategory>(
    `/subcategories/${id}/`,
    {
      active,
    }
  );

  return data;
}

export async function toggleSubCategoryFeatured(
  id: number,
  featured: boolean
): Promise<SubCategory> {
  const { data } = await api.patch<SubCategory>(
    `/subcategories/${id}/`,
    {
      featured,
    }
  );

  return data;
}


export async function getSubCategoryStats(): Promise<{
  total: number;
  featured: number;
  active: number;
  inactive: number;
  products: number;
}> {
  const { data } = await api.get<{
    total: number;
    featured: number;
    active: number;
    inactive: number;
    products: number;
  }>("/subcategories/stats/");

  return data;
}