import { SubCategoryToolbar } from "@/components/subcategories/subcategory-toolbar";
import { SubCategoryStats } from "@/components/subcategories/subcategory-stats";
import { SubCategoryTable } from "@/components/subcategories/subcategory-table";
import { SubCategoryPagination } from "@/components/subcategories/subcategory-pagination";
import { SubCategoryEmpty } from "@/components/subcategories/subcategory-empty";

import {
  getSubCategories,
  getSubCategoryStats,
} from "@/services/subcategory.service";

export default async function SubCategoriesPage() {
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

  const totalSubCategories = stats.total;

  const featuredSubCategories = stats.featured;

  const activeSubCategories = stats.active;

  const inactiveSubCategories = stats.inactive;

  const totalProducts = stats.products;

  return (
    <div className="space-y-6">
      <SubCategoryToolbar />

      <SubCategoryStats
        totalSubCategories={totalSubCategories}
        featuredSubCategories={featuredSubCategories}
        totalProducts={totalProducts}
        activeSubCategories={activeSubCategories}
        inactiveSubCategories={inactiveSubCategories}
      />

      {subcategories.length > 0 ? (
        <>
          <SubCategoryTable
  subcategories={subcategories}
  totalCount={stats.total}
/>

          <SubCategoryPagination
            count={count}
            next={next}
            previous={previous}
          />
        </>
      ) : (
        <SubCategoryEmpty />
      )}
    </div>
  );
}