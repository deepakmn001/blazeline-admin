import { notFound } from "next/navigation";

import { getProduct } from "@/services/product.service";
import { ProductForm } from "@/components/products/product-form";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditProductPage({
  params,
}: Props) {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);

    // 👇 Temporary debug
    console.log("========== PRODUCT ==========");
    console.log(JSON.stringify(product, null, 2));
    console.log("=============================");

    if (!product) {
      notFound();
    }

    return (
      <div className="space-y-8">
        <ProductForm
          mode="edit"
          initialData={product}
        />
      </div>
    );
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);
    notFound();
  }
}