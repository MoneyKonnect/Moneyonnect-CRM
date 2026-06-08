import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
    const folios = await db.folio.findMany({
      where: { clientId },
      orderBy: [{ source: "asc" }, { aum: "desc" }],
    });
    const grouped: Record<string, any[]> = {};
    for (const f of folios) {
      const key = f.fundHouse || "Other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    }
    const totalAUM = folios.reduce((s, f) => s + Number(f.aum), 0);
    return NextResponse.json({ folios, grouped, totalAUM, count: folios.length });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
