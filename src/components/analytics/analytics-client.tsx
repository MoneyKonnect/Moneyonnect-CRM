"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const CHART_COLORS = [
  "#3fd1b8", // teal (brand)
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#10b981", // emerald
  "#3b82f6", // blue
];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xl text-xs">
        {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom donut center label
const DonutCenterLabel = ({
  cx,
  cy,
  total,
  label,
}: {
  cx: number;
  cy: number;
  total: number;
  label: string;
}) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
    <tspan x={cx} dy="-6" fontSize="20" fontWeight="700" fill="hsl(var(--foreground))">
      {total}
    </tspan>
    <tspan x={cx} dy="18" fontSize="10" fill="hsl(var(--muted-foreground))">
      {label}
    </tspan>
  </text>
);

// Custom legend pill row
const PillLegend = ({
  items,
}: {
  items: { name: string; value: number; color: string }[];
}) => (
  <div className="flex flex-wrap gap-2 mt-3 justify-center">
    {items.map((item) => (
      <div
        key={item.name}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ background: item.color + "18", color: item.color, border: `1px solid ${item.color}30` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
        {item.name}
        <span className="opacity-70">· {item.value}</span>
      </div>
    ))}
  </div>
);

interface AnalyticsClientProps {
  data: {
    clientsByCategory: { name: string; value: number }[];
    clientsByStatus: { name: string; value: number }[];
    leadsByStage: { name: string; value: number }[];
    leadsBySource: { name: string; value: number }[];
    tasksByStatus: { name: string; value: number }[];
    interactionsByChannel: { name: string; value: number }[];
    clientGrowth: { month: string; count: number }[];
    totalAum: number;
    aumClientCount: number;
  };
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  const categoryTotal = data.clientsByCategory.reduce((s, d) => s + d.value, 0);
  const sourceTotal = data.leadsBySource.reduce((s, d) => s + d.value, 0);

  // Safe pie data — filter out zero values to avoid broken slices
  const safeCategoryData = data.clientsByCategory.filter((d) => d.value > 0);
  const safeSourceData = data.leadsBySource.filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total AUM",
            value: formatCurrency(data.totalAum),
            sub: `across ${data.aumClientCount} clients`,
            accent: "#3fd1b8",
            icon: "₹",
          },
          {
            label: "HNI Clients",
            value: data.clientsByCategory.find((c) => c.name === "HNI")?.value || 0,
            sub: "high net worth",
            accent: "#f59e0b",
            icon: "★",
          },
          {
            label: "Leads in Pipeline",
            value: data.leadsByStage.reduce((s, d) => s + d.value, 0),
            sub: "active leads",
            accent: "#6366f1",
            icon: "⬆",
          },
          {
            label: "Tasks Completed",
            value: data.tasksByStatus.find((t) => t.name === "COMPLETED")?.value || 0,
            sub: "all time",
            accent: "#10b981",
            icon: "✓",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm relative overflow-hidden"
          >
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
              style={{ background: stat.accent }}
            />
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: stat.accent }}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Client growth */}
        <ChartCard title="Client Growth" subtitle="New clients added per month">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.clientGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3fd1b8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3fd1b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="New clients"
                stroke="#3fd1b8"
                strokeWidth={2.5}
                dot={{ fill: "#3fd1b8", r: 4, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, stroke: "#3fd1b8", strokeWidth: 2, fill: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Leads by stage */}
        <ChartCard title="Pipeline by Stage" subtitle="Lead distribution across stages">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.leadsByStage} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {data.leadsByStage.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Clients by category — donut */}
        <ChartCard title="Clients by Category">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={safeCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                dataKey="value"
                nameKey="name"
                paddingAngle={safeCategoryData.length > 1 ? 2 : 0}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {safeCategoryData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
                <DonutCenterLabel
                  cx={0}
                  cy={0}
                  total={categoryTotal}
                  label="clients"
                />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <PillLegend
            items={safeCategoryData.map((d, i) => ({
              name: d.name,
              value: d.value,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
          />
        </ChartCard>

        {/* Interactions by channel */}
        <ChartCard title="Interactions by Channel">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.interactionsByChannel} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Interactions" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {data.interactionsByChannel.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead sources — filled pie */}
        <ChartCard title="Lead Sources">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={safeSourceData}
                cx="50%"
                cy="50%"
                outerRadius={78}
                dataKey="value"
                nameKey="name"
                paddingAngle={safeSourceData.length > 1 ? 2 : 0}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {safeSourceData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <PillLegend
            items={safeSourceData.map((d, i) => ({
              name: d.name,
              value: d.value,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
