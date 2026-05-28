import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "Empty file" }, { status: 400 });

    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
    const fieldMap: Record<string, string> = {
      "name": "fullName", "full name": "fullName", "fullname": "fullName",
      "phone": "phone", "mobile": "phone", "email": "email", "pan": "pan",
      "city": "city", "state": "state", "occupation": "occupation",
      "category": "category", "status": "status", "aum": "aum",
    };

    const created: string[] = [], skipped: string[] = [], errors: string[] = [];

    for (let i = 1; i < Math.min(lines.length, 501); i++) {
      try {
        const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
        const row: any = {};
        headers.forEach((h, idx) => { const f = fieldMap[h]; if (f) row[f] = values[idx] || null; });
        if (!row.fullName) { skipped.push(`Row ${i + 1}: missing name`); continue; }

        if (row.email || row.phone) {
          const ex = await db.client.findFirst({
            where: { ownerId: userId, deletedAt: null, OR: [...(row.email?[{email:row.email}]:[]), ...(row.phone?[{phone:row.phone}]:[])].filter(Boolean) },
          });
          if (ex) { skipped.push(`Row ${i + 1}: ${row.fullName} already exists`); continue; }
        }

        const validCats = ["RETAIL","STANDARD","PREMIUM","HNI","ULTRA_HNI"];
        const validStats = ["ACTIVE","INACTIVE","PROSPECT","DORMANT"];
        const category = validCats.includes(row.category?.toUpperCase()) ? row.category.toUpperCase() : "STANDARD";
        const status = validStats.includes(row.status?.toUpperCase()) ? row.status.toUpperCase() : "ACTIVE";

        const c = await db.client.create({
          data: {
            ownerId: userId, fullName: row.fullName, phone: row.phone || null,
            email: row.email || null, pan: row.pan ? row.pan.toUpperCase() : null,
            city: row.city || null, state: row.state || null, occupation: row.occupation || null,
            category, status, aum: row.aum ? parseFloat(row.aum) : null,
            residency: { create: { residencyType: "RESIDENT_INDIAN" } },
          },
        });
        created.push(c.fullName);
      } catch (err) { errors.push(`Row ${i + 1}: ${(err as any).message?.substring(0, 80)}`); }
    }

    return NextResponse.json({ success: true, created: created.length, skipped: skipped.length, errors: errors.length, details: { created, skipped, errors } });
  } catch (error) {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
