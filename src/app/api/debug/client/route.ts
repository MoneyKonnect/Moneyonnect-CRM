import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClient } from "@/actions/clients";
import { getFamilyGroupsForClient } from "@/actions/family";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" });
    const clientId = req.nextUrl.searchParams.get("id") || "cmpz6cah70047in7kjkq9lzm5";
    
    const results: any = {};

    try {
      const client = await getClient(clientId);
      results.getClient = client ? "✅ OK - " + client.fullName : "❌ NULL";
    } catch(e: any) { results.getClient = "❌ " + e.message?.substring(0, 200); }

    try {
      const groups = await getFamilyGroupsForClient(clientId);
      results.getFamilyGroups = "✅ OK - " + groups.length + " groups";
      results.groupDetails = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        members: g.members?.length,
        memberDetails: g.members?.map((m: any) => ({
          id: m.id,
          fullName: m.fullName,
          linkedClientId: m.linkedClientId,
          linkedClientAUM: m.linkedClient?.aum,
        }))
      }));
    } catch(e: any) { results.getFamilyGroups = "❌ " + e.message?.substring(0, 200); }

    return NextResponse.json(results);
  } catch(e: any) {
    return NextResponse.json({ fatal: e.message });
  }
}
