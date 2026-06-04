import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Detects file type from headers
function detectFileType(headers: string[]): "cams_master" | "cams_aum" | "kfintech" | "relationiq" | "unknown" {
  const h = headers.map(x => x.toLowerCase().replace(/['"]/g, "").trim());
  if (h.includes("pan number") && h.includes("investor name") && h.includes("folio")) return "cams_master";
  if (h.includes("pan") && h.includes("aum") && h.includes("nav")) return "cams_aum";
  if (h.includes("pan_no") || h.includes("inv_name") || h.includes("rupee_bal")) return "kfintech";
  if (h.includes("name") && h.includes("aum") && h.includes("pan")) return "relationiq";
  return "unknown";
}

function cleanPAN(p: string): string {
  return p.replace(/['"]/g, "").trim().toUpperCase();
}

function parseAUM(a: string): number {
  if (!a) return 0;
  try { return parseFloat(a.replace(/['"]/g, "").replace(/,/g, "").trim()) || 0; }
  catch { return 0; }
}

function parseCSV(text: string): { headers: string[], rows: Record<string, string>[] } {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/'/g, "");
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.replace(/"/g, "").trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

    // Build PAN → AUM map from all uploaded files
    const panAUM: Record<string, number> = {};
    const panName: Record<string, string> = {};
    const fileResults: { name: string; type: string; records: number }[] = [];

    for (const file of files) {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      const fileType = detectFileType(headers);

      let records = 0;

      if (fileType === "cams_aum") {
        for (const row of rows) {
          const pan = cleanPAN(row["PAN"] || "");
          const aum = parseAUM(row["AUM"] || "0");
          const name = (row["Investor Name"] || "").trim();
          if (!pan || !aum) continue;
          panAUM[pan] = (panAUM[pan] || 0) + aum;
          if (name) panName[pan] = name;
          records++;
        }
      } else if (fileType === "cams_master") {
        // Master has no AUM — skip AUM extraction but log
        records = rows.length;
      } else if (fileType === "kfintech") {
        for (const row of rows) {
          const pan = cleanPAN(row["PAN_NO"] || "");
          const aum = parseAUM(row["RUPEE_BAL"] || "0");
          const name = (row["INV_NAME"] || "").trim();
          if (!pan || !aum) continue;
          panAUM[pan] = (panAUM[pan] || 0) + aum;
          if (name) panName[pan] = name;
          records++;
        }
      } else if (fileType === "relationiq") {
        for (const row of rows) {
          const pan = cleanPAN(row["PAN"] || "");
          const aum = parseAUM(row["AUM"] || "0");
          const name = (row["Name"] || "").trim();
          if (!pan || !aum) continue;
          panAUM[pan] = (panAUM[pan] || 0) + aum;
          if (name) panName[pan] = name;
          records++;
        }
      }

      fileResults.push({ name: file.name, type: fileType, records });
    }

    const uniquePANs = Object.keys(panAUM);
    if (!uniquePANs.length) {
      return NextResponse.json({ error: "No AUM data found in uploaded files. Make sure you upload the CAMS AUM file or Kfintech file." }, { status: 400 });
    }

    // Fetch all clients with PAN for this user
    const clients = await db.client.findMany({
      where: { ownerId: userId, deletedAt: null, pan: { not: null } },
      select: { id: true, pan: true, fullName: true, aum: true, category: true },
    });

    let updated = 0;
    let notFound = 0;
    const updateLog: string[] = [];

    // Batch update
    const BATCH = 50;
    const toUpdate = clients.filter(c => c.pan && panAUM[c.pan.toUpperCase()]);

    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(async (client) => {
        const pan = client.pan!.toUpperCase();
        const newAUM = panAUM[pan];
        const oldAUM = client.aum ? Number(client.aum) : 0;

        // Auto-update category based on new AUM
        let newCategory = client.category;
        if (newAUM >= 100000000) newCategory = "ULTRA_HNI";
        else if (newAUM >= 10000000) newCategory = "HNI";
        else if (newAUM >= 5000000) newCategory = "PREMIUM";
        else newCategory = "STANDARD";

        await db.client.update({
          where: { id: client.id },
          data: { aum: newAUM, category: newCategory as any },
        });

        updated++;
        if (Math.abs(newAUM - oldAUM) > 10000) {
          updateLog.push(`${client.fullName}: ₹${(oldAUM/100000).toFixed(1)}L → ₹${(newAUM/100000).toFixed(1)}L`);
        }
      }));
    }

    notFound = uniquePANs.length - toUpdate.length;

    // Total AUM
    const totalAUM = toUpdate.reduce((sum, c) => sum + (panAUM[c.pan!.toUpperCase()] || 0), 0);

    return NextResponse.json({
      success: true,
      updated,
      notFound,
      totalAUM,
      fileResults,
      significantChanges: updateLog.slice(0, 20),
      message: `Updated AUM for ${updated} clients. Total AUM: ₹${(totalAUM / 10000000).toFixed(2)} Cr`,
    });
  } catch (error) {
    console.error("AUM sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
