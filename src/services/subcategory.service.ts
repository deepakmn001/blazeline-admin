import api from "@/lib/api";

export async function getSubCategories(categoryId: number) {
  const { data } = await api.get(
    `/subcategories/?category=${categoryId}`
  );

  if (Array.isArray(data)) {
    return data;
  }

  return data.results ?? [];
}