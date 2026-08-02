"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

interface ProductGrowthItem {
  month: string;
  total: number;
}

interface ProductGrowthChartProps {
  data: ProductGrowthItem[];
}

export function ProductGrowthChart({
  data,
}: ProductGrowthChartProps) {
  const chartData = data.map((item) => ({
    month: new Date(item.month).toLocaleString("en-US", {
      month: "short",
    }),
    products: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{
          top: 8,
          right: 4,
          left: -20,
          bottom: 0,
        }}
        barCategoryGap="32%"
      >
        <CartesianGrid
          vertical={false}
          stroke="#ECECEC"
        />

        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 11.5,
            fill: "#9A9A9A",
          }}
          dy={8}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 11.5,
            fill: "#9A9A9A",
          }}
          width={40}
        />

        <Tooltip
          cursor={{
            fill: "rgba(255,90,31,0.05)",
          }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #ECECEC",
            boxShadow:
              "0 12px 32px -8px rgba(17,17,17,0.14)",
            fontSize: 12.5,
          }}
          labelStyle={{
            color: "#111111",
            fontWeight: 600,
            marginBottom: 2,
          }}
        />

        <Bar
          dataKey="products"
          radius={[8, 8, 8, 8]}
          maxBarSize={34}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.month}
              fill={
                index === chartData.length - 1
                  ? "#FF5A1F"
                  : "#FFDCC0"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}