import { CategoryToolbar } from "@/components/categories/category-toolbar";
import { CategoryStats } from "@/components/categories/category-stats";
import { CategoryTable } from "@/components/categories/category-table";
import { CategoryPagination } from "@/components/categories/category-pagination";
import { CategoryEmpty } from "@/components/categories/category-empty";

import { getCategories } from "@/services/category.service";

export default async function CategoriesPage() {
  const {
    categories,
    count,
    next,
    previous,
  } = await getCategories();

  const totalCategories = categories.length;

  const featuredCategories = categories.filter(
    (category) => category.featured
  ).length;

  const activeCategories = categories.filter(
    (category) => category.active
  ).length;

  const inactiveCategories = totalCategories - activeCategories;

  const totalProducts = categories.reduce(
  (total, category) => total + (category.product_count ?? 0),
  0
);

const totalSubcategories = categories.reduce(
  (total, category) => total + (category.subcategory_count ?? 0),
  0
);

  return (
    <div className="space-y-6">

      <CategoryToolbar />

      <CategoryStats
        totalCategories={totalCategories}
        featuredCategories={featuredCategories}
        totalProducts={totalProducts}
        totalSubcategories={totalSubcategories}
        activeCategories={activeCategories}
        inactiveCategories={inactiveCategories}
      />

      {categories.length > 0 ? (
        <>
          <CategoryTable
            categories={categories}
          />

          <CategoryPagination
            count={count}
            next={next}
            previous={previous}
          />
        </>
      ) : (
        <CategoryEmpty />
      )}

    </div>
  );
}