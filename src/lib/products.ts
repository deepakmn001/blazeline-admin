export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  status: "Published" | "Draft" | "Out of Stock";
  featured: boolean;
  heavyDiscount: boolean;
  thumbnail: string;
};

export const products: Product[] = [
  {
    id: "1",
    name: "Kajaria Ceramic Floor Tile 600x600",
    sku: "KJR-6060",
    category: "Tiles & Sanitaryware",
    brand: "Kajaria",
    price: 42,
    stock: 520,
    status: "Published",
    featured: true,
    heavyDiscount: false,
    thumbnail: "/images/products/tiles.jpg",
  },
  {
    id: "2",
    name: "Asian Paints Royale Emulsion 10L",
    sku: "APL-ROYALE",
    category: "Paints & Finishes",
    brand: "Asian Paints",
    price: 4850,
    stock: 83,
    status: "Published",
    featured: false,
    heavyDiscount: true,
    thumbnail: "/images/products/interior-emulsion.jpeg",
  }
];