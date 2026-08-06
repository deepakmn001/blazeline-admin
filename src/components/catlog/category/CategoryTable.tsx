import { DataTable } from "@/components/catalog/shared/table/data-table";

import { categoryColumns } from "./category-columns";

import type { Category } from "@/types/category";

export function CategoryTable({
  categories,
}: {
  categories: Category[];
}) {
  return (
    <DataTable
      columns={categoryColumns}
      data={categories}
    />
  );
}