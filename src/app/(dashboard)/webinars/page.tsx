import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getWebinars } from "@/actions/webinars";
import { WebinarsClient } from "@/components/webinars/webinars-client";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Webinars" };

export default async function WebinarsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const [webinars, leads] = await Promise.all([
    getWebinars(),
    db.lead.findMany({
      where: { ownerId: userId, deletedAt: null, stage: { notIn: ["CONVERTED", "LOST"] } },
      select: { id: true, fullName: true, phone: true, email: true, residencyType: true, interest: true, stage: true },
      orderBy: { fullName: "asc" },
    }),
  ]);
  return (
    <div className="p-6 max-w-[1100px] space-y-6">
      <WebinarsClient webinars={webinars} leads={leads} />
    </div>
  );
}
