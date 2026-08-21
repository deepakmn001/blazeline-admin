"use client";

import { useEffect, useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

import {
  getHomepageCategories,
  createHomepageCategory,
  updateHomepageCategory,
  deleteHomepageCategory,
  type HomepageCategory,
} from "@/services/homepage.service";

import { getCategories } from "@/services/category.service";
import type { Category } from "@/types/category";

export default function HomepageCMSPage() {
  const [items, setItems] = useState<HomepageCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [homepageItems, categoryResponse] =
        await Promise.all([
          getHomepageCategories(),
          getCategories(),
        ]);
       console.log("CATEGORY RESPONSE:", categoryResponse);
console.log(
  "CATEGORIES:",
  categoryResponse.categories
); 

      setItems(
        [...homepageItems].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );

      setCategories(categoryResponse.categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAdd() {
    if (!selectedCategory) return;

    const categoryId = Number(selectedCategory);

    if (
      items.some(
        (item) => item.category.id === categoryId
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const created = await createHomepageCategory({
        category_id: categoryId,
        is_active: true,
        sort_order: items.length,
      });

      setItems((prev) =>
        [...prev, created].sort(
          (a, b) => a.sort_order - b.sort_order
        )
      );

      setSelectedCategory("");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: HomepageCategory) {
    try {
      const updated = await updateHomepageCategory(
        item.id,
        {
          is_active: !item.is_active,
        }
      );

      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? updated : current
        )
      );
    } catch {
      // keep current UI state if request fails
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Remove this category from the homepage?"
    );

    if (!confirmed) return;

    try {
      await deleteHomepageCategory(id);

      setItems((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch {
      // non-fatal
    }
  }

  async function moveItem(
    index: number,
    direction: "up" | "down"
  ) {
    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return;
    }

    const next = [...items];

    [next[index], next[targetIndex]] = [
      next[targetIndex],
      next[index],
    ];

    const reordered = next.map((item, position) => ({
      ...item,
      sort_order: position,
    }));

    setItems(reordered);

    try {
      await Promise.all(
        reordered.map((item) =>
          updateHomepageCategory(item.id, {
            sort_order: item.sort_order,
          })
        )
      );
    } catch {
      await loadData();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm font-semibold text-neutral-400">
          Loading Homepage CMS...
        </div>
      </div>
    );
  }

  const availableCategories = categories.filter(
    (category) =>
      !items.some(
        (item) => item.category.id === category.id
      )
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
          Storefront
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
          Homepage CMS
        </h1>

        <p className="mt-2 text-sm text-neutral-500">
          Control which categories appear in the
          homepage Shop By Category section.
        </p>
      </div>

      {/* ADD CATEGORY */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="homepage-category"
              className="mb-2 block text-sm font-semibold text-neutral-800"
            >
              Add category
            </label>

            <select
              id="homepage-category"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value)
              }
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
            >
              <option value="">
                Select a category
              </option>

              {availableCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedCategory || saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      </section>

      {/* CURRENT HOMEPAGE CATEGORIES */}
      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">
              Homepage Categories
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              {items.length} categories configured
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
            <Save className="h-3.5 w-3.5" />
            Auto saved
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-neutral-900">
              No homepage categories yet
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Add categories above to show them on the
              storefront homepage.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center"
              >
                {/* ORDER */}
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-neutral-300" />

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500">
                    {index + 1}
                  </span>
                </div>

                {/* CATEGORY */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-950">
                    {item.category.name}
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    /categories/{item.category.slug}
                  </p>
                </div>

                {/* STATUS */}
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                    item.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {item.is_active ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hidden
                    </>
                  )}
                </button>

                {/* ORDER CONTROLS */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      moveItem(index, "up")
                    }
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:opacity-30"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    disabled={
                      index === items.length - 1
                    }
                    onClick={() =>
                      moveItem(index, "down")
                    }
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                {/* DELETE */}
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(item.id)
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${item.category.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}