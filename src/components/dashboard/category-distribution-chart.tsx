"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CategoryDistributionItem {
  name: string;
  total: number;
}

interface CategoryDistributionChartProps {
  data: CategoryDistributionItem[];
}

const COLORS = [
  "#FF5A1F",
  "#FF8A50",
  "#FFB080",
  "#FFD0B3",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export function CategoryDistributionChart({
  data,
}: CategoryDistributionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    value: item.total,
    color: COLORS[index % COLORS.length],
  }));

  const total = chartData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <ResponsiveContainer width={168} height={168}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #ECECEC",
                boxShadow:
                  "0 12px 32px -8px rgba(17,17,17,0.14)",
                fontSize: 12.5,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[18px] font-semibold text-ink">
            {total.toLocaleString()}
          </span>

          <span className="text-[10.5px] text-ink-faint">
            Products
          </span>
        </div>
      </div>

      <ul className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-1">
        {chartData.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-2.5 text-[12.5px]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{
                backgroundColor: item.color,
              }}
            />

            <span className="flex-1 truncate text-ink-soft">
              {item.name}
            </span>

            <span className="font-medium text-ink">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}