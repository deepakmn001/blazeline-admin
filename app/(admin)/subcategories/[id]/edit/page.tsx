import { notFound } from "next/navigation";

import { SubCategoryForm } from "@/components/subcategories/subcategory-form";

import { getSubCategory } from "@/services/subcategory.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSubCategoryPage({
  params,
}: Props) {
  const { id } = await params;

  try {
    const subcategory = await getSubCategory(
      Number(id)
    );

    if (!subcategory) {
      notFound();
    }

    return (
      <div className="space-y-8">
        <SubCategoryForm
          mode="edit"
          initialData={subcategory}
        />
      </div>
    );
  } catch {
    notFound();
  }
}