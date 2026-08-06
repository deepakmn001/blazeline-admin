"use client";

import Image from "next/image";

import { ColumnDef } from "@tanstack/react-table";
import { FolderTree } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/components/catlog/shared/table/data-table-column-header";
import { DataTableRowActions } from "@/components/catlog/shared/table/data-table-row-actions";

import type { Category } from "@/types/category";

export const categoryColumns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Category"
      />
    ),

    cell: ({ row }) => {
      const category = row.original;

      return (
        <div className="flex items-center gap-4">

          {category.image ? (
            <Image
              src={category.image}
              alt={category.name}
              width={56}
              height={56}
              className="rounded-xl border object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-neutral-100">
              <FolderTree className="h-6 w-6 text-neutral-400" />
            </div>
          )}

          <div>
            <p className="font-semibold">
              {category.name}
            </p>

            <p className="text-xs text-ink-faint line-clamp-2">
              {category.description}
            </p>
          </div>

        </div>
      );
    },
  },

  {
    accessorKey: "group",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Group"
      />
    ),
  },

  {
    accessorKey: "slug",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Slug"
      />
    ),

    cell: ({ row }) => (
      <code className="rounded bg-neutral-100 px-2 py-1 text-xs">
        {row.original.slug}
      </code>
    ),
  },

  {
    accessorKey: "product_count",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Products"
      />
    ),
  },

  {
    accessorKey: "subcategory_count",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Subcategories"
      />
    ),
  },

  {
    accessorKey: "featured",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Featured"
      />
    ),

    cell: ({ row }) => (
      <Badge
        variant={
          row.original.featured
            ? "success"
            : "secondary"
        }
      >
        {row.original.featured
          ? "Featured"
          : "Normal"}
      </Badge>
    ),
  },

  {
    accessorKey: "active",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
      />
    ),

    cell: ({ row }) => (
      <Badge
        variant={
          row.original.active
            ? "success"
            : "danger"
        }
      >
        {row.original.active
          ? "Active"
          : "Hidden"}
      </Badge>
    ),
  },

  {
    id: "actions",

    enableSorting: false,

    enableHiding: false,

    cell: ({ row }) => (
      <DataTableRowActions
        editHref={`/categories/${row.original.id}`}
      />
    ),
  },
];