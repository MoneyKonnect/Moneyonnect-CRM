import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgUserIds } from "@/lib/org";
import { LeadDetailClient } from "@/components/leads/lead-detail-client";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const orgUserIds = await getOrgUserIds();
  const lead = await db.lead.findFirst({ where: { id, ownerId: { in: orgUserIds }, deletedAt: null } });
  return { title: lead ? lead.fullName : "Lead Not Found" };
}

async function getLead(id: string, orgUserIds: string[]) {
  return db.lead.findFirst({
    where: { id, ownerId: { in: orgUserIds }, deletedAt: null },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      tasks: {
        include: { assignee: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      convertedClient: { select: { id: true, fullName: true } },
    },
  });
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const orgUserIds = await getOrgUserIds();
  const lead = await getLead(id, orgUserIds);
  if (!lead) notFound();
  return (
    <div className="p-6 max-w-4xl">
      <LeadDetailClient lead={lead} />
    </div>
  );
}
