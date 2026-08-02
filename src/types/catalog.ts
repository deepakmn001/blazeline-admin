// src/types/catalog.ts

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface SubCategory {
  id: number;
  name: string;
  slug: string;
  category?: number;
}

/** Backend read shape — exactly what the API returns. */
export interface ProductImage {
  id: number;

  image: string;
  image_url?: string;

  featured: boolean;
  sort_order: number;
}

/**
 * Unified frontend working model for an image row — represents EITHER
 * an existing Cloudinary-backed image OR a newly selected local file,
 * never both. This is the single array `ProductImageUpload` and
 * `ProductPreview` operate on; there is no separate `File[]` state.
 *
 * - `existing: true`  → came from the backend, `id` and `url` are set, `file` is absent.
 * - `existing: false` → a pending local upload, `file` is set, `id`/`url` are absent/empty.
 */
export interface ProductImageItem {
  id?: number;
  file?: File;
  url: string;
  featured: boolean;
  sort_order: number;
  existing: boolean;
}

/* ===========================
   OPTIONS — single source of truth
   Owned entirely by <ProductOptions />.
=========================== */

export type OptionDisplayType = "dropdown" | "buttons" | "color" | "image";

export interface ProductOptionValue {
  id?: number;
  value: string;
  hex_color?: string;
  /** Read-only, present on GET only. */
  image?: string | null;
  sort_order: number;
}

export interface ProductOption {
  id?: number;
  name: string;
  display_type: OptionDisplayType;
  sort_order: number;
  values: ProductOptionValue[];
}

/* ===========================
   VARIANTS
=========================== */

/**
 * One (option, value) pairing on a variant. A variant carries one
 * entry per option axis it participates in (e.g. Finish=GD *and*
 * Size=15mm at once). Same shape is used for both:
 *   - the read-only `selections` returned on GET
 *   - the write-only `option_values` sent on POST/PUT
 */
export interface VariantOptionValue {
  option: string;
  value: string;
  hex_color?: string | null;
  image?: string | null;
}

export interface ProductVariant {
  id?: number;

  /** Read-only. Derived server-side from the variant's option values. */
  name?: string;

  sku: string;

  /** Read-only. Present on GET responses only. Never sent on write. */
  selections?: VariantOptionValue[];

  /**
   * Write-contract shape — one entry per option axis this variant
   * selects. Always populated in frontend state (via hydration on
   * load / creation), optional only because raw GET payloads don't
   * include it.
   */
  option_values?: VariantOptionValue[];

  mrp: number;
  selling_price: number;

  currency: string;

  stock: number;
  in_stock: boolean;

  gst_included: boolean;
  gst_rate: number;

  estimated_dispatch_days: number;

  /** Read-only. Present on GET responses only. Never sent on write. */
  images?: ProductImage[];
}

/** Exact shape expected by POST / PUT for a single variant. */
export type ProductVariantPayload = Omit<
  ProductVariant,
  "selections" | "images" | "name" | "option_values"
> & {
  option_values: VariantOptionValue[];
};

export interface ProductSpecification {
  id?: number;

  key: string;
  value: string;
}

/* ===========================
   PRODUCT RESPONSE (GET)
=========================== */

export interface Product {
  id: number;

  category: Category;
  subcategory: SubCategory;

  name: string;
  slug: string;

  short_description: string;
  description: string;

  featured: boolean;
  active: boolean;

  status: string;

  option_groups: ProductOption[];

  variants: ProductVariant[];

  specifications: ProductSpecification[];

  images: ProductImage[];

  default_variant_id: number | null;

  created_at: string;
  updated_at: string;
}

/* ===========================
   PRODUCT CREATE / UPDATE
=========================== */

export interface ProductPayload {
  category_id: number;
  subcategory_id: number;

  name: string;
  slug: string;

  description: string;
  short_description: string;

  featured: boolean;
  active: boolean;

  status: string;

  options: ProductOption[];

  variants: ProductVariantPayload[];

  specifications: ProductSpecification[];
}