import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" });
    const clientId = req.nextUrl.searchParams.get("id") || "cmpz6cah70047in7kjkq9lzm5";
    const results: any = {};

    const tests = [
      { key: "basic", include: {} },
      { key: "residency", include: { residency: true } },
      { key: "tasks", include: { tasks: true } },
      { key: "goals", include: { goals: true } },
      { key: "onboarding", include: { onboarding: true } },
      { key: "riskProfile", include: { riskProfile: true } },
      { key: "investments", include: { investments: true } },
      { key: "familyMemberProfile", include: { familyMemberProfile: true } },
      { key: "notes", include: { notes: true } },
      { key: "interactions", include: { interactions: true } },
      { key: "referrals", include: { referrals: true } },
    ];

    for (const test of tests) {
      try {
        await (db.client.findFirst as any)({ where: { id: clientId }, include: test.include });
        results[test.key] = "✅ OK";
      } catch(e: any) {
        results[test.key] = "❌ " + e.message?.substring(0, 150);
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch(e: any) {
    return NextResponse.json({ fatal: e.message });
  }
}
