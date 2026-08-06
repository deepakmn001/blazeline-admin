export interface SubCategory {
  id: number;

  category: number;
  category_name: string;

  name: string;
  slug: string;

  description: string;

  image?: string | null;
  icon?: string;

  featured: boolean;
  active: boolean;

  sort_order: number;

  product_count: number;

  created_at: string;
  updated_at: string;
}

export interface SubCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SubCategory[];
}

export interface CreateSubCategoryPayload {
  category: number;

  name: string;
  slug: string;

  description: string;

  image?: File | string | null;
  icon?: string;

  featured: boolean;
  active: boolean;

  sort_order: number;
}

export interface UpdateSubCategoryPayload
  extends Partial<CreateSubCategoryPayload> {}

export interface SubCategoryFilters {
  search?: string;

  category?: number;

  featured?: boolean;

  active?: boolean;

  ordering?: string;

  page?: number;
}