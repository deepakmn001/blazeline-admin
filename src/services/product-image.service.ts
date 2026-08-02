import api from "@/lib/api";
import type { ProductImage } from "@/types/catalog";

export async function uploadProductImage(
  variant: number,
  file: File,
  featured = false,
  sort_order = 0
): Promise<ProductImage> {
  const formData = new FormData();

  formData.append("variant", String(variant));
  formData.append("image", file);
  formData.append("featured", String(featured));
  formData.append("sort_order", String(sort_order));

  const { data } = await api.post<ProductImage>("/product-images/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function deleteProductImage(id: number): Promise<void> {
  await api.delete(`/product-images/${id}/`);
}

export async function getVariantImages(
  variant: number
): Promise<ProductImage[]> {
  const { data } = await api.get<
    ProductImage[] | { results: ProductImage[] }
  >("/product-images/", {
    params: { variant },
  });

  return Array.isArray(data) ? data : data.results;
}

export async function updateProductImage(
  id: number,
  payload: {
    featured?: boolean;
    sort_order?: number;
  }
): Promise<ProductImage> {
  const { data } = await api.patch<ProductImage>(
    `/product-images/${id}/`,
    payload
  );

  return data;
}