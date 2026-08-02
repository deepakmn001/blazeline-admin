import { ReviewToolbar } from "@/components/catalog-review/review-toolbar";
import { CatalogReviewClient } from "@/components/catalog-review/catalog-review-client";

import { getParsedProductsDashboard } from "@/services/catalog-import.service";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
interface CatalogReviewPageProps {
  searchParams: Promise<{
    page?: string;
    page_size?: string;
    search?: string;
    status?: string;
    category?: string;
    finish?: string;
    is_imported?: string;
    ordering?: string;
  }>;
}

export default async function CatalogReviewPage({
  searchParams,
}: CatalogReviewPageProps) {
  const params = await searchParams;

  const page = Number(params.page ?? "1") || 1;
  const MAX_PAGE_SIZE = 50;
  const pageSize = Math.min(Number(params.page_size ?? "25") || 25, MAX_PAGE_SIZE);

  const query = {
    page,
    page_size: pageSize,
    search: params.search,
    status: params.status,
    category: params.category,
    finish: params.finish,
    is_imported:
      params.is_imported === "true"
        ? true
        : params.is_imported === "false"
          ? false
          : undefined,
    ordering: params.ordering,
  };

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const { products, count, stats, facets } = await getParsedProductsDashboard(
    query,
    authHeaders
  );

  return (
    <div className="space-y-6">
      <ReviewToolbar initialStats={stats} facets={facets} />

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Parsed Products
            </h2>

            <p className="mt-1 text-sm text-ink-faint">
              {count} products available for review
            </p>
          </div>
        </div>

        <CatalogReviewClient
          products={products}
          count={count}
          page={page}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}