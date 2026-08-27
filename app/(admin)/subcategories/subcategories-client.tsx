"use client";

import { useCallback, useEffect, useState } from "react";

import { SubCategoryToolbar } from "@/components/subcategories/subcategory-toolbar";
import { SubCategoryStats } from "@/components/subcategories/subcategory-stats";
import { SubCategoryTable } from "@/components/subcategories/subcategory-table";
import { SubCategoryPagination } from "@/components/subcategories/subcategory-pagination";
import { SubCategoryEmpty } from "@/components/subcategories/subcategory-empty";

import {
  getSubCategories,
  getSubCategoryStats,
} from "@/services/subcategory.service";

import type { SubCategory } from "@/types/subcategory";

type Stats = {
  total: number;
  featured: number;
  active: number;
  inactive: number;
  products: number;
};

type PaginationState = {
  count: number;
  next: string | null;
  previous: string | null;
};

export default function SubCategoriesClient() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [subcategories, setSubCategories] = useState<
    SubCategory[]
  >([]);

  const [stats, setStats] = useState<Stats | null>(null);

  const [pagination, setPagination] =
    useState<PaginationState>({
      count: 0,
      next: null,
      previous: null,
    });

  const load = useCallback(async (currentPage: number) => {
    setLoading(true);

    try {
      const [
        {
          subcategories: fetchedSubcategories,
          count,
          next,
          previous,
        },
        fetchedStats,
      ] = await Promise.all([
        getSubCategories({
          page: currentPage,
        }),
        getSubCategoryStats(),
      ]);

      setSubCategories(fetchedSubcategories);

      setStats(fetchedStats);

      setPagination({
        count,
        next,
        previous,
      });
    } catch (error) {
      console.error(
        "[SubCategoriesClient] Failed to load subcategories:",
        error
      );

      setSubCategories([]);

      setPagination({
        count: 0,
        next: null,
        previous: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const handleNext = useCallback(() => {
    if (!pagination.next || loading) {
      return;
    }

    setPage((currentPage) => currentPage + 1);
  }, [pagination.next, loading]);

  const handlePrevious = useCallback(() => {
    if (!pagination.previous || loading) {
      return;
    }

    setPage((currentPage) =>
      Math.max(1, currentPage - 1)
    );
  }, [pagination.previous, loading]);

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        Failed to load data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SubCategoryToolbar />

      <SubCategoryStats
        totalSubCategories={stats.total}
        featuredSubCategories={stats.featured}
        totalProducts={stats.products}
        activeSubCategories={stats.active}
        inactiveSubCategories={stats.inactive}
      />

      {subcategories.length > 0 ? (
        <>
          <SubCategoryTable
            subcategories={subcategories}
            totalCount={stats.total}
          />

          <SubCategoryPagination
            count={pagination.count}
            next={pagination.next}
            previous={pagination.previous}
            loading={loading}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </>
      ) : (
        <SubCategoryEmpty />
      )}
    </div>
  );
}