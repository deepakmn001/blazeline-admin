import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/categories/category-form";
import { getCategory } from "@/services/category.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({
  params,
}: Props) {
  const { id } = await params;

  try {
    const category = await getCategory(Number(id));

    console.log("========== CATEGORY ==========");
    console.log(category);
    console.log("==============================");

    if (!category) {
      notFound();
    }

    return (
      <div className="space-y-8">
        <CategoryForm
          mode="edit"
          initialData={category}
        />
      </div>
    );
  } catch (error) {
    console.error("CATEGORY EDIT ERROR:");
    console.error(error);

    throw error;
  }
}