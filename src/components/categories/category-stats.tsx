"use client";

import {
  FolderTree,
  Star,
  Package,
  Layers3,
  Eye,
  EyeOff,
} from "lucide-react";

interface CategoryStatsProps {
  totalCategories: number;
  featuredCategories: number;
  totalProducts: number;
  totalSubcategories: number;
  activeCategories: number;
  inactiveCategories: number;
}

const cards = [
  {
    key: "categories",
    title: "Total Categories",
    icon: FolderTree,
  },
  {
    key: "featured",
    title: "Featured",
    icon: Star,
  },
  {
    key: "products",
    title: "Products",
    icon: Package,
  },
  {
    key: "subcategories",
    title: "Subcategories",
    icon: Layers3,
  },
  {
    key: "active",
    title: "Active",
    icon: Eye,
  },
  {
    key: "inactive",
    title: "Hidden",
    icon: EyeOff,
  },
];

export function CategoryStats({
  totalCategories,
  featuredCategories,
  totalProducts,
  totalSubcategories,
  activeCategories,
  inactiveCategories,
}: CategoryStatsProps) {
  const values = {
    categories: totalCategories,
    featured: featuredCategories,
    products: totalProducts,
    subcategories: totalSubcategories,
    active: activeCategories,
    inactive: inactiveCategories,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.key}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>

              <span className="text-xs font-medium text-ink-faint">
                Overview
              </span>
            </div>

            <div className="mt-5">
              <p className="text-3xl font-bold tracking-tight text-ink">
                {values[card.key as keyof typeof values]}
              </p>

              <p className="mt-1 text-sm text-ink-faint">
                {card.title}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}