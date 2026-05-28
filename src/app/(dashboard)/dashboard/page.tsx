import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AiInsightsWidget } from "@/components/dashboard/ai-insights-widget";
import { generateSmartAlerts } from "@/actions/intelligence";
import {
  Users,
  TrendingUp,
  CheckSquare,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next30 = new Date(today.getTime() + 30 * 86400000);

  const [
    totalClients, activeLeads, pendingTasks, overdueTasks,
    recentInteractions, leadsByStage, tasksDueToday,
    totalAum, maturingInvestments, dormantLeads, upcomingBirthdays,
  ] = await Promise.all([
    db.client.count({ where: { ownerId: userId, deletedAt: null } }),
    db.lead.count({ where: { ownerId: userId, deletedAt: null, stage: { notIn: ["CONVERTED", "LOST"] } } }),
    db.task.count({ where: { assigneeId: userId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    db.task.count({ where: { assigneeId: userId, status: "PENDING", dueAt: { lt: now } } }),
    db.interaction.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 8,
      include: {
        client: { select: { id: true, fullName: true } },
        familyMember: { select: { fullName: true } },
      },
    }),
    db.lead.groupBy({ by: ["stage"], where: { ownerId: userId, deletedAt: null }, _count: true }),
    db.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: { gte: new Date(today.setHours(0,0,0,0)), lt: new Date(today.setHours(23,59,59,999)) },
      },
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 5,
    }),
    db.client.aggregate({ where: { ownerId: userId, deletedAt: null, aum: { not: null } }, _sum: { aum: true } }),
    db.investment.count({ where: { client: { ownerId: userId }, maturityDate: { gte: now, lte: next30 }, status: "ACTIVE" } }),
    db.lead.findMany({
      where: { ownerId: userId, deletedAt: null, stage: { notIn: ["CONVERTED", "LOST"] }, lastActivityAt: { lt: new Date(now.getTime() - 14 * 86400000) } },
      take: 3,
    }),
    db.client.count({
      where: {
        ownerId: userId, deletedAt: null,
        dob: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        },
      },
    }),
  ]);

  // Generate real-time insights
  const insights: any[] = [];
  if (dormantLeads.length > 0) {
    insights.push({
      id: "dormant",
      type: "alert",
      title: `${dormantLeads.length} leads going cold`,
      body: `${dormantLeads.map(l => l.fullName).slice(0,2).join(", ")} haven't been contacted in 14+ days.`,
      action: "View pipeline",
      href: "/leads",
      priority: "high",
    });
  }
  if (maturingInvestments > 0) {
    insights.push({
      id: "maturity",
      type: "opportunity",
      title: `${maturingInvestments} investments maturing in 30 days`,
      body: "Perfect opportunity to discuss reinvestment options with clients.",
      action: "View clients",
      href: "/clients",
      priority: "high",
    });
  }
  if (upcomingBirthdays > 0) {
    insights.push({
      id: "birthdays",
      type: "opportunity",
      title: `${upcomingBirthdays} client birthday${upcomingBirthdays > 1 ? "s" : ""} this month`,
      body: "Send birthday wishes and schedule a portfolio review call.",
      action: "View calendar",
      href: "/birthdays",
      priority: "medium",
    });
  }
  if (overdueTasks > 0) {
    insights.push({
      id: "overdue",
      type: "alert",
      title: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`,
      body: "Clear your backlog to maintain client relationship quality.",
      action: "View tasks",
      href: "/tasks",
      priority: "high",
    });
  }
  if (insights.length < 3) {
    insights.push({
      id: "nri",
      type: "trend",
      title: "NRI segment opportunity",
      body: "Review NRI clients for FATCA compliance and NRE/NRO optimization.",
      action: "View NRI clients",
      href: "/clients?residency=NRI",
      priority: "medium",
    });
  }

  return {
    totalClients, activeLeads, pendingTasks, overdueTasks,
    recentInteractions, leadsByStage, tasksDueToday,
    totalAum: totalAum._sum.aum ? Number(totalAum._sum.aum) : 0,
    insights,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const userName = ((session?.user as any)?.name ?? "there").split(" ")[0];

  // Generate alerts in background
  generateSmartAlerts().catch(() => {});

  let data: any;
  try { data = await getDashboardData(userId); } catch(e) {
    console.error("Dashboard error:", e);
    data = { totalClients:0, activeLeads:0, pendingTasks:0, overdueTasks:0, recentInteractions:[], leadsByStage:[], tasksDueToday:[], totalAum:0, insights:[] };
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{greeting}, {userName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          {data.overdueTasks > 0 && <span className="text-danger ml-2">· {data.overdueTasks} overdue task{data.overdueTasks > 1 ? "s" : ""}</span>}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Clients" value={data.totalClients.toLocaleString()} change={+12} changeLabel="this month" icon={Users} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
        <KpiCard title="Active Leads" value={data.activeLeads.toLocaleString()} change={+5} changeLabel="new today" icon={TrendingUp} iconColor="text-amber-400" iconBg="bg-amber-500/10" />
        <KpiCard title="Tasks Pending" value={data.pendingTasks.toLocaleString()} change={data.overdueTasks} changeLabel="overdue" changeDanger={data.overdueTasks > 0} icon={CheckSquare} iconColor="text-rose-400" iconBg="bg-rose-500/10" />
        <KpiCard title="Total AUM" value={formatCurrency(data.totalAum)} change={+4.3} changeLabel="vs last month" isPercent icon={IndianRupee} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PipelineOverview leadsByStage={data.leadsByStage} />
          <TasksWidget tasks={data.tasksDueToday} />
        </div>
        <div className="space-y-6">
          <AiInsightsWidget insights={data.insights} />
          <ActivityFeed interactions={data.recentInteractions} />
        </div>
      </div>
    </div>
  );
}
