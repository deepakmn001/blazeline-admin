import { ProductToolbar } from "@/components/products/product-toolbar";
import { ProductTable } from "@/components/products/product-table";
import { ProductPagination } from "@/components/products/product-pagination";
import { ProductEmpty } from "@/components/products/product-empty";

import { getProducts } from "@/services/product.service";

export default async function ProductsPage() {
  const {
    products,
    count,
    next,
    previous,
  } = await getProducts();

  return (
    <div className="space-y-6">
      <ProductToolbar />

      {products.length > 0 ? (
        <>
          <ProductTable products={products} />

          <ProductPagination
            count={count}
            next={next}
            previous={previous}
          />
        </>
      ) : (
        <ProductEmpty />
      )}
    </div>
  );
}