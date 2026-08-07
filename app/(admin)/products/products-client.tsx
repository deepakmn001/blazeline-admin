"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RotateCw } from "lucide-react";
import { toast } from "sonner"; // ya jo bhi toast lib use ho rahi ho

import { ProductToolbar } from "@/components/products/product-toolbar";
import { ProductTable } from "@/components/products/product-table";
import { ProductPagination } from "@/components/products/product-pagination";
import { BulkActionBar } from "@/components/products/bulk-action-bar";
import { BulkDeleteDialog } from "@/components/products/bulk-delete-dialog";
import { BulkMoveDialog } from "@/components/products/bulk-move-dialog";
import type {
  StatusFilterValue,
  StockFilterValue,
} from "@/components/products/product-toolbar";

import {
  getProducts,
  deleteProduct,
   bulkDeleteProducts,
  bulkMoveProducts,
  ProductListResponse,
} from "@/services/product.service";
import type { Product } from "@/types/catalog";

type ProductId = Product["id"];
type DeleteTarget = { id: ProductId; slug: string };

const SEARCH_DEBOUNCE_MS = 300;

// TODO: confirm against Django REST_FRAMEWORK.PAGE_SIZE (DRF settings.py).
// ProductPagination derives totalPages from count/PAGE_SIZE client-side —
// if this doesn't match the backend paginator exactly, page numbers and
// last-page detection will be wrong even though hasNext/hasPrevious from
// the API are correct. Change this one constant once confirmed.
const PAGE_SIZE = 10;

interface ProductsData {
  products: Product[];
  count: number;
  next: string | null;
  previous: string | null;
}

const EMPTY_DATA: ProductsData = {
  products: [],
  count: 0,
  next: null,
  previous: null,
};

export default function ProductsClient() {
  const [data, setData] = useState<ProductsData>(EMPTY_DATA);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [category, setCategory] = useState<number | "">("");
  const [subcategory, setSubcategory] = useState<number | "">("");
  const [status, setStatus] = useState<StatusFilterValue>("");
  const [stock, setStock] = useState<StockFilterValue>("");
  const [ordering, setOrdering] = useState("");
  const [page, setPage] = useState(1);

  // Selection is fully owned here, not in ProductTable — that's what lets
  // ProductTable stay a dumb, memoizable renderer.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<ProductId>>(
    () => new Set()
  );

  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [isBulkMoveDialogOpen, setIsBulkMoveDialogOpen] = useState(false);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  /* -------------------------------------------------------------- */
  /* Debounced search — 300ms, phir page reset ek hi batched update  */
  /* me, taaki double-fetch na ho.                                   */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const handleCategoryChange = useCallback((value: number | "") => {
    setCategory(value);
    setSubcategory("");
    setPage(1);
  }, []);

  const handleSubCategoryChange = useCallback((value: number | "") => {
    setSubcategory(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: StatusFilterValue) => {
    setStatus(value);
    setPage(1);
  }, []);

  // Stock abhi ProductFilter (backend) ka part nahi hai — client-side only.
  const handleStockChange = useCallback((value: StockFilterValue) => {
    setStock(value);
  }, []);

  // Ordering badalte hi page 1 pe reset — same batched pattern jo
  // category/subcategory/status already follow karte hain, taaki
  // ordering change se exactly ek hi fetch trigger ho (page + ordering
  // dono ek render me commit hote hain).
  const handleOrderingChange = useCallback((value: string) => {
    setOrdering(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  /* -------------------------------------------------------------- */
  /* Selection                                                        */
  /* -------------------------------------------------------------- */
  const handleToggleRow = useCallback((id: ProductId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Current page ids ek ref me — taaki handleToggleSelectAll empty-deps
  // rahe (stable reference), ProductRow re-renders minimize karne ke liye.
  const currentPageIdsRef = useRef<ProductId[]>([]);
  currentPageIdsRef.current = useMemo(
    () => data.products.map((p) => p.id),
    [data.products]
  );

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === currentPageIdsRef.current.length
        ? new Set()
        : new Set(currentPageIdsRef.current)
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected =
    data.products.length > 0 &&
    data.products.every((p) => selectedIds.has(p.id));

  const isIndeterminate =
    !isAllSelected && data.products.some((p) => selectedIds.has(p.id));

  /* -------------------------------------------------------------- */
  /* Product fetching — race-safe via incrementing request id.       */
  /* -------------------------------------------------------------- */
  const loadProducts = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const response: ProductListResponse = await getProducts({
        page,
        search: debouncedSearch || undefined,
        category: category === "" ? undefined : category,
        subcategory: subcategory === "" ? undefined : subcategory,
        status: status || undefined,
        ordering: ordering || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setData({
        products: response.products,
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      setError("Couldn't load products. Check your connection and try again.");
    } finally {
      if (requestId !== requestIdRef.current) return;
      hasLoadedOnceRef.current = true;
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [page, debouncedSearch, category, subcategory, status, ordering]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Page ya filters (ordering samet) badalne par selection stale ho
  // jaati hai — clear.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, category, subcategory, status, ordering]);

  /* -------------------------------------------------------------- */
  /* Delete — optimistic remove, fail hone par rollback.              */
  /* ProductActions se {id, slug} aata hai; API slug se delete karti  */
  /* hai (product.service.ts), client-side matching id se hota hai.  */
  /* -------------------------------------------------------------- */
  const handleDeleteProduct = useCallback(
    async ({ id, slug }: DeleteTarget) => {
      const previousData = data;
      const previousSelected = selectedIds;

      setData((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
        count: Math.max(0, prev.count - 1),
      }));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      try {
        await deleteProduct(slug);
        toast.success("Product deleted");

        setData((current) => {
          if (current.products.length === 0 && page > 1) {
            setPage((p) => p - 1);
          }
          return current;
        });
      } catch (err) {
        console.error(err);
        setData(previousData);
        setSelectedIds(previousSelected);
        toast.error(`Couldn't delete "${slug}". Please try again.`);
      }
    },
    [data, selectedIds, page]
  );

  /* -------------------------------------------------------------- */
  /* Bulk Delete                                                       */
  /* -------------------------------------------------------------- */
  const handleOpenBulkDelete = useCallback(() => {
    setIsBulkDeleteDialogOpen(true);
  }, []);

  const handleCloseBulkDelete = useCallback(() => {
    setIsBulkDeleteDialogOpen((wasOpen) => {
      if (isBulkDeleting) return wasOpen;
      return false;
    });
  }, [isBulkDeleting]);

  const handleConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const idSet = new Set(ids);
    const previousData = data;
    const previousSelected = selectedIds;

    setIsBulkDeleting(true);

    setData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => !idSet.has(p.id)),
      count: Math.max(0, prev.count - ids.length),
    }));
    setSelectedIds(new Set());

    try {
      await bulkDeleteProducts(ids);
      toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} deleted`);
      setIsBulkDeleteDialogOpen(false);

      setData((current) => {
        if (current.products.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return current;
      });
    } catch (err) {
      console.error(err);
      setData(previousData);
      setSelectedIds(previousSelected);
      toast.error("Couldn't delete the selected products. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [data, selectedIds, page]);

  /* -------------------------------------------------------------- */
  /* Bulk Move                                                          */
  /* -------------------------------------------------------------- */
  const handleOpenBulkMove = useCallback(() => {
    setIsBulkMoveDialogOpen(true);
  }, []);

  const handleCloseBulkMove = useCallback(() => {
    setIsBulkMoveDialogOpen((wasOpen) => {
      if (isBulkMoving) return wasOpen;
      return false;
    });
  }, [isBulkMoving]);

  const handleConfirmBulkMove = useCallback(
    async (categoryId: number, subcategoryId: number) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setIsBulkMoving(true);
      try {
        await bulkMoveProducts(ids, categoryId, subcategoryId);
        toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} moved`);
        setIsBulkMoveDialogOpen(false);
        setSelectedIds(new Set());
        await loadProducts();
      } catch (err) {
        console.error(err);
        toast.error("Couldn't move the selected products. Please try again.");
      } finally {
        setIsBulkMoving(false);
      }
    },
    [selectedIds, loadProducts]
  );

  const handleRetry = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="space-y-6">
      <ProductToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        selectedCategory={category}
        onCategoryChange={handleCategoryChange}
        selectedSubCategory={subcategory}
        onSubCategoryChange={handleSubCategoryChange}
        status={status}
        onStatusChange={handleStatusChange}
        stock={stock}
        onStockChange={handleStockChange}
        ordering={ordering}
        onOrderingChange={handleOrderingChange}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDelete={handleOpenBulkDelete}
        onMove={handleOpenBulkMove}
        onClear={handleClearSelection}
      />

      <div className="relative">
        <div
          className={
            isRefreshing
              ? "pointer-events-none opacity-50 transition-opacity"
              : "transition-opacity"
          }
        >
          <ProductTable
            products={data.products}
            isLoading={isInitialLoading}
            error={error}
            onRetry={handleRetry}
            selectedIds={selectedIds}
            onToggleRow={handleToggleRow}
            onToggleSelectAll={handleToggleSelectAll}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onDeleteProduct={handleDeleteProduct}
          />
        </div>

        {isRefreshing && (
          <div className="absolute inset-0 flex items-start justify-center pt-10">
            <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-medium text-ink-faint shadow-sm">
              <RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Updating...
            </div>
          </div>
        )}
      </div>

      {!isInitialLoading && !error && data.products.length > 0 && (
        <ProductPagination
          count={data.count}
          page={page}
          hasNext={Boolean(data.next)}
          hasPrevious={Boolean(data.previous)}
          onPageChange={handlePageChange}
          pageSize={PAGE_SIZE}
        />
      )}

      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        count={selectedIds.size}
        isDeleting={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onClose={handleCloseBulkDelete}
      />

      <BulkMoveDialog
        open={isBulkMoveDialogOpen}
        count={selectedIds.size}
        isMoving={isBulkMoving}
        onConfirm={handleConfirmBulkMove}
        onClose={handleCloseBulkMove}
      />
    </div>
  );
}