import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CampaignsClient } from "@/components/campaigns/campaigns-client";

export const metadata: Metadata = { title: "Campaigns" };

async function getCampaigns(userId: string) {
  return db.campaign.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { recipients: true } },
    },
  });
}

export default async function CampaignsPage() {
  const session = await auth();
  const campaigns = await getCampaigns((session?.user as any)?.id ?? "");

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <CampaignsClient campaigns={campaigns} />
    </div>
  );
}
