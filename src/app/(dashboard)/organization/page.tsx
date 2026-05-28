import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrganizationClient } from "@/components/organization/organization-client";

export const metadata: Metadata = { title: "Organization" };

async function getOrgData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  // In a full multi-tenant app, you'd fetch all org members
  // For now, show the current user as the only member
  return { members: user ? [user] : [], plan: "Professional" };
}

export default async function OrganizationPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const data = await getOrgData(userId);
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <OrganizationClient data={data} currentUserId={userId} />
    </div>
  );
}
