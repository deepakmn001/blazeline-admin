"use client";

import Image from "next/image";
import { FolderTree } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import type { Category } from "@/types/category";
import { CategoryActions } from "./category-actions";

interface CategoryTableProps {
  categories: Category[];
}

export function CategoryTable({
  categories,
}: CategoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">

      {/* Header */}

      <div className="flex items-center justify-between border-b border-line px-6 py-5">

        <div>

          <h2 className="text-lg font-semibold text-ink">
            All Categories
          </h2>

          <p className="mt-1 text-sm text-ink-faint">
            {categories.length} categories available
          </p>

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full min-w-[1350px]">

          <thead className="bg-neutral-50">

            <tr className="border-b border-line">

              <th className="w-14 px-4 py-4">
                <Checkbox />
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Category
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Group
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Slug
              </th>

              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
                Products
              </th>

              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
                Subcategories
              </th>

              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
                Featured
              </th>

              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
                Status
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Updated
              </th>

              <th className="px-4 py-4 text-right text-xs font-semibold uppercase">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {categories.map((category) => (

              <tr
                key={category.id}
                className="border-b border-line transition hover:bg-neutral-50"
              >

                <td className="px-4">
                  <Checkbox />
                </td>

                <td className="px-6 py-5">

                  <div className="flex items-center gap-4">

                    {category.image ? (

                      <img
  src={
    typeof category.image === "string"
      ? category.image
      : ""
  }

                        alt={category.name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-xl border object-cover"
                      />

                    ) : (

                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-neutral-100">

                        <FolderTree className="h-7 w-7 text-neutral-400" />

                      </div>

                    )}

                    <div>

                      <h3 className="font-semibold text-ink">
                        {category.name}
                      </h3>

                      <p className="mt-1 line-clamp-2 max-w-sm text-xs text-ink-faint">
                        {category.description}
                      </p>

                    </div>

                  </div>

                </td>

                <td className="px-4">

                  <Badge variant="secondary">
                    {category.group}
                  </Badge>

                </td>

                <td className="px-4">

                  <code className="rounded bg-neutral-100 px-2 py-1 text-xs">
                    {category.slug}
                  </code>

                </td>

                <td className="px-4 text-center font-semibold">
                  {category.product_count}
                </td>

                <td className="px-4 text-center font-semibold">
                  {category.subcategory_count}
                </td>

                <td className="px-4 text-center">

                  <Badge
                    variant={
                      category.featured
                        ? "success"
                        : "secondary"
                    }
                  >
                    {category.featured
                      ? "Featured"
                      : "Normal"}
                  </Badge>

                </td>

                <td className="px-4 text-center">

                  <Badge
                    variant={
                      category.active
                        ? "success"
                        : "danger"
                    }
                  >
                    {category.active
                      ? "Active"
                      : "Hidden"}
                  </Badge>

                </td>

                <td className="px-4 text-sm text-ink-faint">
                  {new Date(
                    category.updated_at
                  ).toLocaleDateString()}
                </td>

                <td className="px-4 text-right">

                 <CategoryActions
  categoryId={category.id}
  featured={category.featured}
  active={category.active}
/>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}