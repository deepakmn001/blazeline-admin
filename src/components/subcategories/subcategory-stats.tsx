import {
  Boxes,
  FolderTree,
  Package,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";

import { Card } from "@/components/ui/card";

interface SubCategoryStatsProps {
  totalSubCategories: number;
  featuredSubCategories: number;
  totalProducts: number;
  activeSubCategories: number;
  inactiveSubCategories: number;
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>

          <p className="text-sm text-ink-faint">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-bold">
            {value}
          </h3>

        </div>

        <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
          {icon}
        </div>

      </div>
    </Card>
  );
}

export function SubCategoryStats({
  totalSubCategories,
  featuredSubCategories,
  totalProducts,
  activeSubCategories,
  inactiveSubCategories,
}: SubCategoryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

      <StatCard
        title="Total"
        value={totalSubCategories}
        icon={<FolderTree className="h-6 w-6" />}
      />

      <StatCard
        title="Featured"
        value={featuredSubCategories}
        icon={<Star className="h-6 w-6" />}
      />

      <StatCard
        title="Products"
        value={totalProducts}
        icon={<Package className="h-6 w-6" />}
      />

      <StatCard
        title="Active"
        value={activeSubCategories}
        icon={<Eye className="h-6 w-6" />}
      />

      <StatCard
        title="Hidden"
        value={inactiveSubCategories}
        icon={<EyeOff className="h-6 w-6" />}
      />

    </div>
  );
}