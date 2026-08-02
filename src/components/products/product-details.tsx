"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Pencil, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Product } from "@/types/catalog";

type Props = {
  product: Product;
};

export function ProductDetails({
  product,
}: Props) {

  const variant = product.variants?.[0];

  const image =
    variant?.images?.find((img) => img.featured)?.image_url ??
    variant?.images?.[0]?.image_url ??
    "/images/placeholder.png";

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            {product.name}
          </h1>

          <div className="mt-3 flex gap-2">

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

            {product.featured && (
              <Badge variant="brand">
                <Star className="mr-1 h-3 w-3" />
                Featured
              </Badge>
            )}

          </div>

        </div>

        <Button asChild>

          <Link href={`/products/${product.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Product
          </Link>

        </Button>

      </div>

      {/* Main */}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">

        {/* Image */}

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">

          <Image
            src={image}
            alt={product.name}
            width={500}
            height={500}
            className="w-full rounded-xl object-cover"
          />

        </div>

        {/* Details */}

        <div className="space-y-6">

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold">
              Product Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <p className="text-xs text-neutral-500">
                  Category
                </p>

                <p className="font-medium">
                   {product.category?.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-500">
                  Sub Category
                </p>

                <p className="font-medium">
                   {product.subcategory?.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-500">
                  Slug
                </p>

                <p>{product.slug}</p>
              </div>

              <div>
                <p className="text-xs text-neutral-500">
                  Active
                </p>

                <p>
                  {product.active ? "Yes" : "No"}
                </p>
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold">
              Description
            </h2>

            <p className="mt-4 whitespace-pre-line text-neutral-700">
              {product.description}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}