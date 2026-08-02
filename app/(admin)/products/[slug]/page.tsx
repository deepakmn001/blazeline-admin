import { notFound } from "next/navigation";

import { getProduct } from "@/services/product.service";
import { ProductDetails } from "@/components/products/product-details";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductDetailsPage({
  params,
}: Props) {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);

    if (!product) {
      notFound();
    }

    return <ProductDetails product={product} />;
  } catch (error) {
    console.error(error);
    notFound();
  }
}