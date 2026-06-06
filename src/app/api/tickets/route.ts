import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    if ((session.user as any).role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only Super Admins can create tickets" }, { status: 403 });
    const { title, description, assignedToId, priority } = await req.json();
    if (!title?.trim() || !assignedToId) return NextResponse.json({ error: "Title and assignee required" }, { status: 400 });
    const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const ticket = await db.ticket.create({
      data: { title: title.trim(), description: description?.trim() || null, assignedToId, assignedById: userId, priority: priority || "MEDIUM", dueAt },
      include: { assignedTo: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ticket });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
