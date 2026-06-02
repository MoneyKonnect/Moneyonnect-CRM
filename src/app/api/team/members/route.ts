import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [users, pendingInvites] = await Promise.all([
      db.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.teamInvite.findMany({
        where: { used: false, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ users, pendingInvites });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (!session || userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admins can change roles" }, { status: 403 });
    }

    const { userId, role } = await req.json();

    if (userId === currentUserId) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    await db.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (!session || userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admins can remove members" }, { status: 403 });
    }

    const { userId } = await req.json();

    if (userId === currentUserId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
