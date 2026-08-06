import api from "@/lib/api";

import type {
  Category,
  CategoryFilters,
  CategoryListResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "@/types/category";

interface CategoryServiceResponse {
  categories: Category[];
  count: number;
  next: string | null;
  previous: string | null;
}

function normalizeList(
  data: Category[] | CategoryListResponse
): CategoryServiceResponse {
  if (Array.isArray(data)) {
    return {
      categories: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  return {
    categories: data.results ?? [],
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function getCategories(
  filters?: CategoryFilters
): Promise<CategoryServiceResponse> {
  const { data } = await api.get<Category[] | CategoryListResponse>(
    "/categories/",
    {
      params: filters,
    }
  );

  return normalizeList(data);
}

export async function getCategory(
  id: number
): Promise<Category> {
  const { data } = await api.get<Category>(
    `/categories/${id}/`
  );

  return data;
}

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category> {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("slug", payload.slug);
  formData.append("description", payload.description);
  formData.append("group", payload.group);
  formData.append("icon", payload.icon ?? "");
  formData.append("featured", String(payload.featured));
  formData.append("active", String(payload.active));
  formData.append("sort_order", String(payload.sort_order));

  if (payload.image instanceof File) {
    formData.append("image", payload.image);
  }

  const { data } = await api.post<Category>(
    "/categories/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function updateCategory(
  id: number,
  payload: UpdateCategoryPayload
): Promise<Category> {

  const formData = new FormData();

  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }

  if (payload.slug !== undefined) {
    formData.append("slug", payload.slug);
  }

  if (payload.description !== undefined) {
    formData.append(
      "description",
      payload.description
    );
  }

  if (payload.group !== undefined) {
    formData.append("group", payload.group);
  }

  if (payload.icon !== undefined) {
    formData.append(
      "icon",
      payload.icon ?? ""
    );
  }

  if (payload.featured !== undefined) {
    formData.append(
      "featured",
      String(payload.featured)
    );
  }

  if (payload.active !== undefined) {
    formData.append(
      "active",
      String(payload.active)
    );
  }

  if (payload.sort_order !== undefined) {
    formData.append(
      "sort_order",
      String(payload.sort_order)
    );
  }

  if (payload.image instanceof File) {
    formData.append(
      "image",
      payload.image
    );
  }

  const { data } = await api.patch<Category>(
    `/categories/${id}/`,
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

  return data;
}

export async function deleteCategory(
  id: number
): Promise<void> {
  await api.delete(`/categories/${id}/`);
}

export async function toggleCategoryStatus(
  id: number,
  active: boolean
): Promise<Category> {
  const { data } = await api.patch<Category>(
    `/categories/${id}/`,
    {
      active,
    }
  );

  return data;
}

export async function toggleFeatured(
  id: number,
  featured: boolean
): Promise<Category> {
  const { data } = await api.patch<Category>(
    `/categories/${id}/`,
    {
      featured,
    }
  );

  return data;
}