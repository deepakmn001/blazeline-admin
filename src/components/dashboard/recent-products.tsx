import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecentProduct {
  id: number;
  name: string;
  category: string | null;
  subcategory: string | null;
  status: string;
  created_at: string;
  image: string | null;
}

interface RecentProductsProps {
  products: RecentProduct[];
}

const statusVariant = {
  published: "success",
  draft: "warning",
  hidden: "danger",
} as const;

export function RecentProducts({
  products,
}: RecentProductsProps) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
            <th className="pb-3 font-semibold">Product</th>
            <th className="pb-3 font-semibold">Category</th>
            <th className="pb-3 font-semibold">Subcategory</th>
            <th className="pb-3 font-semibold">Status</th>
            <th className="pb-3 font-semibold">Created</th>
            <th className="pb-3 font-semibold" />
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="group border-b border-line/70 last:border-0 hover:bg-canvas/60 transition-colors"
            >
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-canvas ring-1 ring-line">
                    <Image
                      src={product.image || "/placeholder.png"}
                      alt={product.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {product.name}
                    </p>
                  </div>
                </div>
              </td>

              <td className="py-3.5 pr-4 text-[12.5px]">
                {product.category}
              </td>

              <td className="py-3.5 pr-4 text-[12.5px]">
                {product.subcategory}
              </td>

              <td className="py-3.5 pr-4">
                <Badge
                  variant={
                    statusVariant[
                      product.status as keyof typeof statusVariant
                    ]
                  }
                >
                  {product.status}
                </Badge>
              </td>

              <td className="py-3.5 pr-4 text-[12px] text-ink-soft">
                {new Date(product.created_at).toLocaleDateString()}
              </td>

              <td className="py-3.5 text-right">
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-faint hover:text-brand-600"
                >
                  View
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}