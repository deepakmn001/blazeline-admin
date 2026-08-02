"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ReviewTable, type ReviewProduct, type BulkAction, type ProductId } from "@/components/catalog-review/review-table";
import { ReviewDrawer } from "@/components/catalog-review/review-drawer";
import {
  bulkParsedProductAction,
  deleteParsedProduct,
  downloadCsvBlob,
  exportParsedProductsCsv,
  publishParsedProduct,
  type ParsedProduct,
} from "@/services/catalog-import.service";

interface CatalogReviewClientProps {
  products: ParsedProduct[];
  count: number;
  page: number;
  pageSize: number;
}

export function CatalogReviewClient({
  products,
  count,
  page,
  pageSize,
}: CatalogReviewClientProps) {
  const [rows, setRows] = useState(products);
  const [totalItems, setTotalItems] = useState(count);

  useEffect(() => {
    setRows(products);
    setTotalItems(count);
  }, [products, count]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<ProductId>>(new Set());
  const [publishingIds, setPublishingIds] = useState<ProductId[]>([]);
  const [deletingIds, setDeletingIds] = useState<ProductId[]>([]);

  const [drawerProductId, setDrawerProductId] = useState<ProductId | null>(null);
  const drawerOpen = drawerProductId !== null;
  const drawerIndex = useMemo(
    () => rows.findIndex((p) => p.id === drawerProductId),
    [rows, drawerProductId],
  );
  const drawerProduct = drawerIndex >= 0 ? rows[drawerIndex] : null;

  const setUrlParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => setUrlParam("page", String(nextPage)),
    [setUrlParam],
  );

  const handlePageSizeChange = useCallback(
    (nextSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page_size", String(nextSize));
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // ------------------------------------------------------
  // Single-row actions
  // ------------------------------------------------------
  const handleReview = useCallback((product: ReviewProduct) => {
    setDrawerProductId(product.id);
  }, []);

  const handleEdit = useCallback((product: ReviewProduct) => {
    router.push(`/catalog-review/${product.id}/edit`);
  }, [router]);

  const handlePublish = useCallback(
    async (product: ReviewProduct) => {
      setPublishingIds((prev) => [...prev, product.id]);
      try {
        const result = await publishParsedProduct(Number(product.id));

        if (result.success) {
          toast.success(`${product.product_name} published`);
        } else {
          toast.error("Publish failed");
        }

        setRows((prev) => prev.filter((p) => p.id !== product.id));
        setTotalItems((prev) => Math.max(0, prev - 1));

        if (drawerProductId === product.id) {
          setDrawerProductId(null);
        }
      } catch (err) {
        toast.error(`Failed to publish ${product.product_name}`);
      } finally {
        setPublishingIds((prev) => prev.filter((id) => id !== product.id));
      }
    },
    [drawerProductId],
  );

  const handleDelete = useCallback(
    async (product: ReviewProduct) => {
      const confirmed = window.confirm(
        `Delete "${product.product_name}"? This cannot be undone.`,
      );
      if (!confirmed) return;

      setDeletingIds((prev) => [...prev, product.id]);
      try {
        await deleteParsedProduct(Number(product.id));
        toast.success(`${product.product_name} deleted`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
        if (drawerProductId === product.id) setDrawerProductId(null);
        setRows((prev) => prev.filter((p) => p.id !== product.id));
        setTotalItems((prev) => Math.max(0, prev - 1));
      } catch (err) {
        toast.error(`Failed to delete ${product.product_name}`);
      } finally {
        setDeletingIds((prev) => prev.filter((id) => id !== product.id));
      }
    },
    [drawerProductId],
  );

  // ------------------------------------------------------
  // Bulk actions
  // ------------------------------------------------------
  const handleBulkAction = useCallback(
    async (action: BulkAction, ids: ProductId[]) => {
      if (ids.length === 0) return;

      if (action === "export_csv") {
        try {
          const blob = await exportParsedProductsCsv(ids as (number | string)[]);
          downloadCsvBlob(blob);
          toast.success(`Exported ${ids.length} products`);
        } catch {
          toast.error("Export failed");
        }
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(`Delete ${ids.length} selected products?`);
        if (!confirmed) return;
      }

      try {
        const result = await bulkParsedProductAction(action, ids as (number | string)[]);

        if (action === "publish") {
          if ((result.published ?? 0) > 0) {
            toast.success(`${result.published} products published`);
          }

          if ((result.failed?.length ?? 0) > 0) {
            console.log("Failed Publish:", result.failed);

            result.failed!.forEach((item) => {
              toast.error(`${item.sku}: ${item.error}`);
            });
          }
        } else {
          const verb =
            action === "delete" ? "deleted" :
            action === "mark_valid" ? "marked valid" :
            "marked invalid";

          toast.success(`${result.deleted ?? result.updated ?? ids.length} products ${verb}`);
        }

        setSelectedIds(new Set());

        if (action === "publish" || action === "delete") {
          const removed = ids.length;
          setRows((prev) => prev.filter((p) => !ids.includes(p.id)));
          setTotalItems((prev) => Math.max(0, prev - removed));
        }
      } catch {
        toast.error("Bulk action failed");
      }
    },
    [],
  );

  // ------------------------------------------------------
  // Drawer navigation
  // ------------------------------------------------------
  const handleDrawerPrevious = useCallback(() => {
    if (drawerIndex > 0) {
      setDrawerProductId(rows[drawerIndex - 1].id);
    }
  }, [drawerIndex, rows]);

  const handleDrawerNext = useCallback(() => {
    if (drawerIndex >= 0 && drawerIndex < rows.length - 1) {
      setDrawerProductId(rows[drawerIndex + 1].id);
    }
  }, [drawerIndex, rows]);

  return (
    <>
      <ReviewTable
        products={rows}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onReview={handleReview}
        onEdit={handleEdit}
        onPublish={handlePublish}
        onDelete={handleDelete}
        onBulkAction={handleBulkAction}
        publishingIds={publishingIds}
        deletingIds={deletingIds}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
      />

      <ReviewDrawer
        product={drawerProduct}
        open={drawerOpen}
        onClose={() => setDrawerProductId(null)}
        onEdit={handleEdit}
        onPublish={handlePublish}
        onDelete={handleDelete}
        onPrevious={handleDrawerPrevious}
        onNext={handleDrawerNext}
        hasPrevious={drawerIndex > 0}
        hasNext={drawerIndex >= 0 && drawerIndex < rows.length - 1}
        isPublishing={drawerProduct ? publishingIds.includes(drawerProduct.id) : false}
        isDeleting={drawerProduct ? deletingIds.includes(drawerProduct.id) : false}
      />
    </>
  );
}