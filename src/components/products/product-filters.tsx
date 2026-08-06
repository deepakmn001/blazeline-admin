"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";

import { getCategories } from "@/services/category.service";
import { getSubCategories } from "@/services/subcategory.service";

import type { Category } from "@/types/category";
import type { SubCategory } from "@/types/subcategory";

export function ProductFilters() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | "">("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | "">(
    ""
  );

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory("");
    }
  }, [selectedCategory]);

  async function loadCategories() {
    try {
      const { categories } = await getCategories();
      setCategories(categories);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadSubCategories(categoryId: number) {
    try {
      const { subcategories } = await getSubCategories({
        category: categoryId,
      });

      setSubCategories(subcategories);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category */}
      <select
        value={selectedCategory}
        onChange={(e) =>
          setSelectedCategory(
            e.target.value ? Number(e.target.value) : ""
          )
        }
        className="h-10 rounded-xl border border-line bg-white px-4 text-sm"
      >
        <option value="">All Categories</option>

        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {/* Sub Category */}
      <select
        value={selectedSubCategory}
        onChange={(e) =>
          setSelectedSubCategory(
            e.target.value ? Number(e.target.value) : ""
          )
        }
        disabled={!selectedCategory}
        className="h-10 rounded-xl border border-line bg-white px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">All Sub Categories</option>

        {subCategories.map((subcategory) => (
          <option
            key={subcategory.id}
            value={subcategory.id}
          >
            {subcategory.name}
          </option>
        ))}
      </select>

      {/* Status */}
      <select className="h-10 rounded-xl border border-line bg-white px-4 text-sm">
        <option value="">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="hidden">Hidden</option>
      </select>

      {/* More Filters */}
      <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm hover:bg-neutral-50">
        <Filter className="h-4 w-4" />
        More Filters
      </button>
    </div>
  );
}