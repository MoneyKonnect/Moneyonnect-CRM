import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MeetingSetupClient from "./meeting-setup-client";

export const metadata: Metadata = { title: "Meeting Set-Up" };

export default async function MeetingSetupPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const leads = await db.lead.findMany({
    where: { ownerId: userId, deletedAt: null, stage: { notIn: ["CONVERTED", "LOST"] } },
    select: { id: true, fullName: true, phone: true, email: true, residencyType: true, interest: true, stage: true },
    orderBy: { fullName: "asc" },
  });
  return <MeetingSetupClient leads={leads} />;
}
