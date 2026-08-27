"use client";

import Image from "next/image";
import { FolderTree } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import type { SubCategory } from "@/types/subcategory";

import { SubCategoryActions } from "./subcategory-actions";

interface SubCategoryTableProps {
  subcategories: SubCategory[];
  totalCount: number;
}

export function SubCategoryTable({
  subcategories,
  totalCount,
}: SubCategoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-line px-6 py-5">

        <div>

          <h2 className="text-lg font-semibold text-ink">
            All Sub Categories
          </h2>

          <p className="mt-1 text-sm text-ink-faint">
            {totalCount} sub categories available
          </p>

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full min-w-[1400px]">

          <thead className="bg-neutral-50">

            <tr className="border-b border-line">

              <th className="w-14 px-4 py-4">
                <Checkbox />
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Sub Category
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Category
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Slug
              </th>

              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
                Products
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold uppercase">
  Sort Order
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

            {subcategories.map((subcategory) => (

              <tr
                key={subcategory.id}
                className="border-b border-line transition hover:bg-neutral-50"
              >

                <td className="px-4">
                  <Checkbox />
                </td>

                <td className="px-6 py-5">

                  <div className="flex items-center gap-4">

                    {subcategory.image ? (

                      <Image
                        src={subcategory.image}
                        alt={subcategory.name}
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
                        {subcategory.name}
                      </h3>

                      <p className="mt-1 line-clamp-2 max-w-sm text-xs text-ink-faint">
                        {subcategory.description}
                      </p>

                    </div>

                  </div>

                </td>

                <td className="px-4">

                  <Badge variant="secondary">
                    {subcategory.category_name}
                  </Badge>

                </td>

                <td className="px-4">

                  <code className="rounded bg-neutral-100 px-2 py-1 text-xs">
                    {subcategory.slug}
                  </code>

                </td>

                <td className="px-4 text-center font-semibold">
                  {subcategory.product_count}
                </td>
<td className="px-4 text-center">
  <span className="inline-flex min-w-10 items-center justify-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-ink">
    {subcategory.sort_order}
  </span>
</td>
                <td className="px-4 text-center">

                  <Badge
                    variant={
                      subcategory.featured
                        ? "success"
                        : "secondary"
                    }
                  >
                    {subcategory.featured
                      ? "Featured"
                      : "Normal"}
                  </Badge>

                </td>

                <td className="px-4 text-center">

                  <Badge
                    variant={
                      subcategory.active
                        ? "success"
                        : "danger"
                    }
                  >
                    {subcategory.active
                      ? "Active"
                      : "Hidden"}
                  </Badge>

                </td>

                <td className="px-4 text-sm text-ink-faint">
                  {new Date(
                    subcategory.updated_at
                  ).toLocaleDateString()}
                </td>

                <td className="px-4 text-right">

                  <SubCategoryActions
                    subCategoryId={subcategory.id}
                    featured={subcategory.featured}
                    active={subcategory.active}
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