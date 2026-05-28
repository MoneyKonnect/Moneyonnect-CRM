"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  IndianRupee,
  Users,
  TrendingUp,
  Award,
  ArrowUpRight,
  Share2,
} from "lucide-react";
import { cn, formatCurrency, getInitials, generateAvatarColor } from "@/lib/utils";
import Link from "next/link";

const CHART_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#3b82f6","#a855f7"];

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  ULTRA_HNI: { label: "Ultra HNI", color: "#10b981" },
  HNI: { label: "HNI", color: "#f59e0b" },
  PREMIUM: { label: "Premium", color: "#8b5cf6" },
  STANDARD: { label: "Standard", color: "#3b82f6" },
  RETAIL: { label: "Retail", color: "#6b7280" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
        {label && <p className="font-medium text-foreground mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {typeof p.value === "number" && p.value > 100000 ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AumDashboardClient({ data }: { data: any }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryChartData = Object.entries(data.byCategory).map(([cat, vals]: any) => ({
    name: CATEGORY_CONFIG[cat]?.label || cat,
    aum: vals.aum,
    clients: vals.count,
  })).sort((a, b) => b.aum - a.aum);

  const residencyChartData = Object.entries(data.byResidency).map(([type, vals]: any) => ({
    name: type.replace(/_/g, " "),
    value: (vals as any).count,
    aum: (vals as any).aum,
  }));

  const invTypeData = Object.entries(data.byInvestmentType)
    .map(([type, amount]: any) => ({ name: type.replace(/_/g, " "), value: amount }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">AUM Dashboard</h1>
            <p className="text-sm text-muted-foreground">Assets under management breakdown</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total AUM", value: formatCurrency(data.totalAUM), icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Clients", value: data.clientCount, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Avg AUM / Client", value: formatCurrency(data.averageAUM), icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Top Referrers", value: data.referrers.length, icon: Share2, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AUM by Category */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">AUM by Client Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryChartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="aum" name="AUM" radius={[0, 4, 4, 0]}>
                {categoryChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Residency breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Client Residency Split</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={residencyChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                {residencyChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name, props) => [`${v} clients · ${formatCurrency(props.payload.aum)}`, name]} />
              <Legend formatter={v => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Investment type breakdown */}
      {invTypeData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Investment Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={invTypeData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                {invTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 clients by AUM */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Top Clients by AUM</h3>
          </div>
          <div className="divide-y divide-border">
            {data.topClients.map((client: any, i: number) => (
              <Link key={client.id} href={`/clients/${client.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-bold text-muted-foreground/40 w-5 flex-shrink-0">{i + 1}</span>
                <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0", generateAvatarColor(client.id))}>
                  {getInitials(client.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{client.fullName}</p>
                  <p className={cn("text-2xs font-medium", CATEGORY_CONFIG[client.category]?.color || "text-muted-foreground")}>
                    {CATEGORY_CONFIG[client.category]?.label || client.category}
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-400 flex-shrink-0">{formatCurrency(Number(client.aum || 0))}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Referral network */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Share2 className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-foreground">Top Referrers</h3>
          </div>
          {data.referrers.length === 0 ? (
            <div className="p-8 text-center">
              <Share2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No referral data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Link clients to their referrers to track referral network</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.referrers.map((r: any, i: number) => (
                <Link key={r.id} href={`/clients/${r.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors">
                  <span className="text-sm font-bold text-muted-foreground/40 w-5 flex-shrink-0">{i + 1}</span>
                  <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0", generateAvatarColor(r.id))}>
                    {getInitials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-2xs text-muted-foreground">{r.referralCount} referral{r.referralCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-brand-400">{formatCurrency(r.referralAUM)}</p>
                    <p className="text-2xs text-muted-foreground">referral AUM</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
