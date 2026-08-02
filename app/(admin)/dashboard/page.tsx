import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { StatCardItem } from "@/components/dashboard/stat-card";
import { VisitorsChart } from "@/components/dashboard/visitors-chart";
import { ProductGrowthChart } from "@/components/dashboard/product-growth-chart";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentProducts } from "@/components/dashboard/recent-products";

import { getDashboard } from "@/lib/api/dashboard";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  const statCards = [
    {
      label: "Total Products",
      value: dashboard.stats.total_products,
      delta: "",
      hint: "All catalog products",
      trend: "flat" as const,
    },
    {
      label: "Published",
      value: dashboard.stats.published_products,
      delta: "",
      hint: "Visible to customers",
      trend: "up" as const,
    },
    {
      label: "Drafts",
      value: dashboard.stats.draft_products,
      delta: "",
      hint: "Pending publication",
      trend: "flat" as const,
    },
    {
      label: "Categories",
      value: dashboard.stats.categories,
      delta: "",
      hint: `${dashboard.stats.subcategories} Subcategories`,
      trend: "flat" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
              Good morning, Admin
            </h1>

            <Badge variant="brand">
              Live Dashboard
            </Badge>
          </div>

          <p className="mt-1 text-[13px] text-ink-faint">
  Here&apos;s what&apos;s happening across your catalog today.
</p>
        </div>

        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium"
          type="button"
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </button>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardItem
            key={stat.label}
            stat={stat}
          />
        ))}
      </div>

      {/* Charts */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Visitors</CardTitle>
              <CardDescription>
                Coming Soon
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <VisitorsChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Category Distribution
            </CardTitle>

            <CardDescription>
              Products by category
            </CardDescription>
          </CardHeader>

          <CardContent>
            <CategoryDistributionChart
              data={dashboard.category_distribution}
            />
          </CardContent>
        </Card>
      </div>

      {/* Growth */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              Product Growth
            </CardTitle>

            <CardDescription>
              Published products
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ProductGrowthChart
              data={dashboard.product_growth}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Quick Actions
            </CardTitle>
          </CardHeader>

          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Recent Activity
            </CardTitle>
          </CardHeader>

          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      {/* Products */}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Recent Products
            </CardTitle>

            <CardDescription>
              Latest additions
            </CardDescription>
          </div>

          <Link
            href="/products"
            className="flex items-center gap-1 text-[12.5px] font-medium text-brand-600"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>

        <CardContent>
          <RecentProducts
            products={dashboard.recent_products}
          />
        </CardContent>
      </Card>
    </div>
  );
}