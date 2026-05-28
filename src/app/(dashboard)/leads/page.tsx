import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadPipelineBoard } from "@/components/leads/lead-pipeline-board";
import { LeadsHeader } from "@/components/leads/leads-header";

export const metadata: Metadata = { title: "Pipeline" };

async function getLeadsGrouped(userId: string) {
  const leads = await db.lead.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { lastActivityAt: "desc" },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      tasks: {
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      convertedClient: { select: { id: true, fullName: true } },
    },
  });

  // Group by stage
  const stages = [
    "NEW",
    "CONTACTED",
    "MEETING_SCHEDULED",
    "INTERESTED",
    "DOCUMENTATION_PENDING",
    "PAYMENT_PENDING",
    "CONVERTED",
    "DORMANT",
    "LOST",
  ] as const;

  const grouped = stages.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<string, typeof leads>);

  return { leads, grouped, total: leads.length };
}

export default async function LeadsPage() {
  const session = await auth();
  const { leads, grouped, total } = await getLeadsGrouped((session?.user as any)?.id ?? "");

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <LeadsHeader total={total} />
      </div>
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <LeadPipelineBoard grouped={grouped} />
      </div>
    </div>
  );
}
