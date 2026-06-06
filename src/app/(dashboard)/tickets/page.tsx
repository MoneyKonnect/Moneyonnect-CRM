import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import TicketsClient from "./tickets-client";

export const metadata: Metadata = { title: "My Work" };

export default async function TicketsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const userRole = (session?.user as any)?.role ?? "";

  await db.ticket.updateMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  const [tickets, teamMembers] = await Promise.all([
    db.ticket.findMany({
      where: userRole === "SUPER_ADMIN" ? {} : { assignedToId: userId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    }),
    userRole === "SUPER_ADMIN"
      ? db.user.findMany({ select: { id: true, name: true, email: true, role: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <TicketsClient tickets={tickets} teamMembers={teamMembers} isSuperAdmin={userRole === "SUPER_ADMIN"} myUserId={userId} />
    </div>
  );
}
