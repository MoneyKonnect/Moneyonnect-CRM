"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function toCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
}

export async function exportClients() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id as string;

    const clients = await db.client.findMany({
      where: { ownerId: userId, deletedAt: null },
      include: { residency: true, tags: { include: { tag: true } } },
      orderBy: { fullName: "asc" },
    });

    const rows: string[][] = [
      ["Name","Phone","Email","PAN","Category","Status","AUM","City","State","Residency","Risk Appetite","Occupation","Tags","Member Since"],
      ...clients.map(c => [
        c.fullName,
        c.phone ?? "",
        c.email ?? "",
        c.pan ?? "",
        c.category,
        c.status,
        c.aum ? Number(c.aum).toString() : "",
        c.city ?? "",
        c.state ?? "",
        c.residency?.residencyType ?? "RESIDENT_INDIAN",
        c.riskAppetite ?? "",
        c.occupation ?? "",
        c.tags.map(t => t.tag.name).join("; "),
        c.createdAt.toLocaleDateString("en-IN"),
      ]),
    ];

    return { success: true, csv: toCSV(rows), filename: `clients-${new Date().toISOString().split("T")[0]}.csv` };
  } catch { return { success: false, error: "Export failed" }; }
}

export async function exportLeads() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id as string;

    const leads = await db.lead.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const rows: string[][] = [
      ["Name","Phone","Email","Stage","Source","Estimated Value","Score","Next Follow-up","Created"],
      ...leads.map(l => [
        l.fullName,
        l.phone ?? "",
        l.email ?? "",
        l.stage,
        l.source,
        l.estimatedValue ? Number(l.estimatedValue).toString() : "",
        l.score.toString(),
        l.nextFollowUpAt ? l.nextFollowUpAt.toLocaleDateString("en-IN") : "",
        l.createdAt.toLocaleDateString("en-IN"),
      ]),
    ];

    return { success: true, csv: toCSV(rows), filename: `leads-${new Date().toISOString().split("T")[0]}.csv` };
  } catch { return { success: false, error: "Export failed" }; }
}

export async function exportTasks() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id as string;

    const tasks = await db.task.findMany({
      where: { assigneeId: userId },
      include: { client: { select: { fullName: true } } },
      orderBy: { dueAt: "asc" },
    });

    const rows: string[][] = [
      ["Title","Client","Type","Priority","Status","Due Date","Created"],
      ...tasks.map(t => [
        t.title,
        t.client?.fullName ?? "",
        t.type,
        t.priority,
        t.status,
        t.dueAt ? t.dueAt.toLocaleDateString("en-IN") : "",
        t.createdAt.toLocaleDateString("en-IN"),
      ]),
    ];

    return { success: true, csv: toCSV(rows), filename: `tasks-${new Date().toISOString().split("T")[0]}.csv` };
  } catch { return { success: false, error: "Export failed" }; }
}
