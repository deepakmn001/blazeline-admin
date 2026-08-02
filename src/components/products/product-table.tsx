"use client";

import Image from "next/image";
import { Package, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Product } from "@/types/catalog";
import { ProductActions } from "./product-actions";
interface ProductTableProps {
  products: Product[];
}

export function ProductTable({
  products,
}: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            All Products
          </h2>

          <p className="mt-1 text-sm text-ink-faint">
            {products.length} products available
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">

        <table className="w-full min-w-[1100px]">

          <thead className="bg-neutral-50">

            <tr className="border-b border-line">

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">
                Product
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Category
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Variant
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Price
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Stock
              </th>

              <th className="px-4 py-4 text-left text-xs font-semibold uppercase">
                Status
              </th>

              <th className="px-4 py-4 text-right text-xs font-semibold uppercase">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {products.map((product) => {

              const variant = product.variants?.[0];

              const image =
  variant?.images?.find((img) => img.featured)
    ?.image_url ??
  variant?.images?.[0]?.image_url ??
  null;

              return (

                <tr
                  key={product.id}
                  className="border-b border-line transition hover:bg-neutral-50"
                >

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-4">

                      {image ? (
  <Image
    src={image}
    alt={product.name}
    width={60}
    height={60}
    className="h-[60px] w-[60px] rounded-xl border object-cover"
  />
) : (
  <div className="flex h-[60px] w-[60px] items-center justify-center rounded-xl border bg-neutral-100">
    <Package className="h-7 w-7 text-neutral-400" />
  </div>
)}

                      <div>

                        <div className="flex items-center gap-2">

                          <h3 className="font-semibold text-ink">
                            {product.name}
                          </h3>

                          {product.featured && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}

                        </div>

                        <p className="mt-1 text-xs text-ink-faint">
                          {variant?.sku || "No SKU"}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-4">

                    <div className="font-medium">
                       {product.category?.name}
                    </div>

                    <div className="text-xs text-ink-faint">
                       {product.subcategory?.name}
                    </div>

                  </td>

                  <td className="px-4">
                    {variant?.name || "-"}
                  </td>

                  <td className="px-4 font-semibold">
                    ₹{variant?.selling_price ?? "-"}
                  </td>

                  <td className="px-4">
                    {variant?.stock ?? 0}
                  </td>

                  <td className="px-4">

                    <Badge
                      variant={
                        product.status === "published"
                          ? "success"
                          : product.status === "draft"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {product.status}
                    </Badge>

                  </td>

                  <td className="px-4">

                  <ProductActions
    productId={product.id}
    productSlug={product.slug}
/>

                  </td>

                </tr>

              );
            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}