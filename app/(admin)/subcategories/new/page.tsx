import { SubCategoryForm } from "@/components/subcategories/subcategory-form";

export default function NewSubCategoryPage() {
  return (
    <div className="space-y-8">
      <SubCategoryForm
        mode="create"
      />
    </div>
  );
}