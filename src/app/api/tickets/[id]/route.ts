import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const { status } = await req.json();
    const existing = await db.ticket.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.assignedToId !== userId && userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    const ticket = await db.ticket.update({
      where: { id: params.id },
      data: { status, ...(status === "DONE" ? { completedAt: new Date() } : {}) },
      include: { assignedTo: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ticket });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await db.ticket.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
