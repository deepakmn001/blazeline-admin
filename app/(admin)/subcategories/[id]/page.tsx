import { notFound } from "next/navigation";

import { getSubCategory } from "@/services/subcategory.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubCategoryPage({
  params,
}: Props) {
  const { id } = await params;

  const subcategory = await getSubCategory(
    Number(id)
  );

  if (!subcategory) {
    notFound();
  }

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        {subcategory.name}
      </h1>

      <div className="rounded-xl border bg-white p-6">

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <p className="text-sm text-muted-foreground">
              Category
            </p>

            <p className="font-medium">
              {subcategory.category_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Slug
            </p>

            <p className="font-medium">
              {subcategory.slug}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Products
            </p>

            <p className="font-medium">
              {subcategory.product_count}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Status
            </p>

            <p className="font-medium">
              {subcategory.active
                ? "Active"
                : "Hidden"}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}