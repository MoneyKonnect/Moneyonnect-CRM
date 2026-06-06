import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const metadata: Metadata = { title: "Analytics" };

async function getAnalyticsData(userId: string) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const [
    clientsByCategory,
    clientsByStatus,
    leadsByStage,
    leadsBySource,
    tasksByStatus,
    clientsOverTime,
    interactionsByChannel,
    totalAum,
  ] = await Promise.all([
    // Clients by category
    db.client.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _count: true,
    }),
    // Clients by status
    db.client.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    // Leads by stage
    db.lead.groupBy({
      by: ["stage"],
      where: { deletedAt: null },
      _count: true,
    }),
    // Leads by source
    db.lead.groupBy({
      by: ["source"],
      where: { deletedAt: null },
      _count: true,
    }),
    // Tasks by status
    db.task.groupBy({
      by: ["status"],
      where: { assigneeId: userId },
      _count: true,
    }),
    // Clients created over past 6 months (monthly)
    db.client.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Interactions by channel
    db.interaction.groupBy({
      by: ["channel"],
      where: { userId },
      _count: true,
    }),
    // Total AUM
    db.client.aggregate({
      where: { deletedAt: null, aum: { not: null } },
      _sum: { aum: true },
      _count: true,
    }),
  ]);

  // Build monthly client growth chart
  const monthlyData: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    monthlyData[key] = 0;
  }
  for (const c of clientsOverTime) {
    const key = new Date(c.createdAt).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    if (monthlyData[key] !== undefined) monthlyData[key]++;
  }
  const clientGrowth = Object.entries(monthlyData).map(([month, count]) => ({
    month,
    count,
  }));

  return {
    clientsByCategory: clientsByCategory.map((d) => ({
      name: d.category.replace("_", " "),
      value: d._count,
    })),
    clientsByStatus: clientsByStatus.map((d) => ({
      name: d.status,
      value: d._count,
    })),
    leadsByStage: leadsByStage.map((d) => ({
      name: d.stage.replace("_", " "),
      value: d._count,
    })),
    leadsBySource: leadsBySource.map((d) => ({
      name: d.source.replace("_", " "),
      value: d._count,
    })),
    tasksByStatus: tasksByStatus.map((d) => ({
      name: d.status,
      value: d._count,
    })),
    interactionsByChannel: interactionsByChannel.map((d) => ({
      name: d.channel.replace("_", " "),
      value: d._count,
    })),
    clientGrowth,
    totalAum: totalAum._sum.aum ? Number(totalAum._sum.aum) : 0,
    aumClientCount: totalAum._count,
  };
}

export default async function AnalyticsPage() {
  const session = await auth();
  const data = await getAnalyticsData((session?.user as any)?.id ?? "");

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
      </div>

      <AnalyticsClient data={data} />
    </div>
  );
}
