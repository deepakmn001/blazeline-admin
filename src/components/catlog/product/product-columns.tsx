"use client";

import Image from "next/image";

import { ColumnDef } from "@tanstack/react-table";

import { Package, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/components/catlog/shared/table/data-table-column-header";
import { DataTableRowActions } from "@/components/catlog/shared/table/data-table-row-actions";

import type { Product } from "@/types/catalog";

export const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Product"
      />
    ),

    cell: ({ row }) => {
      const product = row.original;

      const variant = product.variants?.[0];

      const image =
        variant?.images?.find((img) => img.featured)?.image_url ??
        variant?.images?.[0]?.image_url ??
        null;

      return (
        <div className="flex items-center gap-4">

          {image ? (
            <Image
              src={image}
              alt={product.name}
              width={60}
              height={60}
              className="rounded-xl border object-cover"
            />
          ) : (
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-xl border bg-neutral-100">
              <Package className="h-7 w-7 text-neutral-400" />
            </div>
          )}

          <div>

            <div className="flex items-center gap-2">

              <p className="font-semibold">
                {product.name}
              </p>

              {product.featured && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}

            </div>

            <p className="text-xs text-ink-faint">
              {variant?.sku}
            </p>

          </div>

        </div>
      );
    },
  },

  {
    accessorKey: "category",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Category"
      />
    ),

    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.category?.name}
        </div>

        <div className="text-xs text-ink-faint">
          {row.original.subcategory?.name}
        </div>
      </div>
    ),
  },

  {
    accessorKey: "price",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Price"
      />
    ),

    cell: ({ row }) => {
      const variant = row.original.variants?.[0];

      return (
        <span className="font-semibold">
          ₹{variant?.selling_price ?? "-"}
        </span>
      );
    },
  },

  {
    accessorKey: "stock",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Stock"
      />
    ),

    cell: ({ row }) => {
      const variant = row.original.variants?.[0];

      return variant?.stock ?? 0;
    },
  },

  {
    accessorKey: "status",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
      />
    ),

    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "published"
            ? "success"
            : row.original.status === "draft"
            ? "warning"
            : "danger"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },

  {
    id: "actions",

    enableSorting: false,

    enableHiding: false,

    cell: ({ row }) => (
      <DataTableRowActions
        viewHref={`/products/${row.original.slug}`}
        editHref={`/products/${row.original.slug}/edit`}
        showFeature
      />
    ),
  },
];