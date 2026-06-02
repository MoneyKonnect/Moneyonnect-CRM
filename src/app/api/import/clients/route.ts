import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function parseResidency(val: string): string {
  const v = (val || "").toLowerCase().trim();
  if (v.includes("nri") || v.includes("non-resident")) return "NRI";
  return "RESIDENT_INDIAN";
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const parts = val.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
    if (!isNaN(date.getTime())) return date;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    // Handle BOM
    const cleaned = text.replace(/^\uFEFF/, "");
    const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "Empty file" }, { status: 400 });

    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());

    const fieldMap: Record<string, string> = {
      "name": "fullName", "full name": "fullName", "fullname": "fullName",
      "phone": "phone", "mobile": "phone",
      "email": "email",
      "pan": "pan",
      "city": "city",
      "state": "state",
      "occupation": "occupation",
      "category": "category",
      "status": "clientStatus",
      "aum": "aum",
      "residency": "residency",
      "risk appetite": "riskProfile",
      "tags": "tags",
      "member since": "memberSince",
    };

    const created: string[] = [], skipped: string[] = [], errors: string[] = [];
    const BATCH_SIZE = 50;

    // Parse all rows first
    const rows: any[] = [];
    for (let i = 1; i < Math.min(lines.length, 1001); i++) {
      const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        const f = fieldMap[h];
        if (f) row[f] = values[idx] || null;
      });
      if (!row.fullName) { skipped.push(`Row ${i + 1}: missing name`); continue; }
      rows.push(row);
    }

    // Process in batches
    for (let b = 0; b < rows.length; b += BATCH_SIZE) {
      const batch = rows.slice(b, b + BATCH_SIZE);

      await Promise.all(batch.map(async (row) => {
        try {
          // Dedup check
          if (row.email || row.phone) {
            const orClause = [];
            if (row.email) orClause.push({ email: row.email });
            if (row.phone) orClause.push({ phone: row.phone });
            const ex = await db.client.findFirst({
              where: { ownerId: userId, deletedAt: null, OR: orClause },
            });
            if (ex) { skipped.push(`${row.fullName} already exists`); return; }
          }

          const validCats = ["RETAIL","STANDARD","PREMIUM","HNI","ULTRA_HNI"];
          const validStats = ["ACTIVE","INACTIVE","PROSPECT","DORMANT"];
          const category = validCats.includes((row.category||"").toUpperCase()) ? row.category.toUpperCase() : "STANDARD";
          // Map "Investment Ready" → ACTIVE
          const rawStatus = (row.clientStatus || "active").toLowerCase();
          const status = rawStatus.includes("invest") || rawStatus.includes("active") ? "ACTIVE"
            : rawStatus.includes("inactive") ? "INACTIVE"
            : rawStatus.includes("prospect") ? "PROSPECT"
            : validStats.includes(rawStatus.toUpperCase()) ? rawStatus.toUpperCase()
            : "ACTIVE";

          const residencyType = parseResidency(row.residency || "resident");
          const memberSince = parseDate(row.memberSince || "");

          await db.client.create({
            data: {
              ownerId: userId,
              fullName: row.fullName,
              phone: row.phone || null,
              email: row.email || null,
              pan: row.pan ? row.pan.toUpperCase() : null,
              city: row.city || null,
              state: row.state || null,
              occupation: row.occupation || null,
              category,
              status,
              aum: row.aum ? parseFloat(row.aum.replace(/[^0-9.]/g, "")) : null,
              createdAt: memberSince || undefined,
              residency: { create: { residencyType } },
            },
          });
          created.push(row.fullName);
        } catch (err) {
          errors.push(`${row.fullName}: ${(err as any).message?.substring(0, 80)}`);
        }
      }));
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: { created, skipped, errors: errors.slice(0, 20) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
