import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrganizationClient } from "@/components/organization/organization-client";

export const metadata: Metadata = { title: "Organization" };

async function getOrgData() {
  const [members, pendingInvites] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.teamInvite.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, pendingInvites, plan: "Professional" };
}

export default async function OrganizationPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const data = await getOrgData();
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <OrganizationClient data={data} currentUserId={userId} />
    </div>
  );
}
