import api from "@/lib/api";

export async function getCategories() {
  const { data } = await api.get("/categories/");

  // DRF pagination support
  if (Array.isArray(data)) {
    return data;
  }

  return data.results ?? [];
}