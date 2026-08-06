"use client";

import { useEffect, useState } from "react";

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

export default function SubCategoriesClient() {
  const [loading, setLoading] = useState(true);

  const [subcategories, setSubCategories] = useState<SubCategory[]>([]);

  const [stats, setStats] = useState<Stats | null>(null);

  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [
        {
          subcategories,
          count,
          next,
          previous,
        },
        stats,
      ] = await Promise.all([
        getSubCategories(),
        getSubCategoryStats(),
      ]);

      setSubCategories(subcategories);

      setStats(stats);

      setPagination({
        count,
        next,
        previous,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
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
          />
        </>
      ) : (
        <SubCategoryEmpty />
      )}
    </div>
  );
}