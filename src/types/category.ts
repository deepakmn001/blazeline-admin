export type CategoryStatus = "active" | "inactive";

export interface Category {
  id: number;

  name: string;
  slug: string;

  group: string;
  description: string;

  image?: string | null;
  icon?: string;

  featured: boolean;
  active: boolean;

  sort_order: number;

  // Backend me abhi nahi aa rahe,
  // isliye optional rakho
  product_count?: number;
  subcategory_count?: number;

  created_at: string;
  updated_at: string;
}

export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}

export interface CategoryFilters {
  search?: string;
  group?: string;
  featured?: boolean;
  active?: boolean;
  ordering?: string;
  page?: number;
}

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  description: string;
  group: string;

  image?: File | string | null;
  icon?: string;

  featured: boolean;
  active: boolean;

  sort_order: number;
}

export interface UpdateCategoryPayload
  extends Partial<CreateCategoryPayload> {}