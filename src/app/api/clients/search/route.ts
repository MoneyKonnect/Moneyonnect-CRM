import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id ?? "";

  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q || q.length < 2) return NextResponse.json({ clients: [] });

  const clients = await db.client.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { pan: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, pan: true, phone: true, email: true, city: true, aum: true },
    take: 10,
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ clients });
}
