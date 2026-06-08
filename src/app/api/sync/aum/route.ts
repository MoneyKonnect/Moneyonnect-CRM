import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function isValidPAN(pan: string): boolean {
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

// ─── CAMS parser ──────────────────────────────────────────────────────────────
function parseCAMS(text: string): { pan: string; folioNo: string; schemeName: string; fundHouse: string; units: number; aum: number; name: string }[] {
  const results: any[] = [];
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return results;

  const parseRow = (line: string): string[] => {
    const cols: string[] = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan");
  const aumIdx = headers.indexOf("aum");
  const nameIdx = headers.indexOf("investor name");
  const schemeIdx = headers.indexOf("scheme");
  const folioIdx = headers.indexOf("folio no");
  const unitsIdx = headers.indexOf("closing balance");
  const fundIdx = headers.indexOf("rta agent code");

  if (panIdx === -1 || aumIdx === -1) return results;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseRow(line);
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue;
    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    const schemeName = schemeIdx >= 0 ? (cols[schemeIdx] || "").trim() : "";
    if (!schemeName) continue;
    results.push({
      pan,
      folioNo: folioIdx >= 0 ? (cols[folioIdx] || "").trim() : "",
      schemeName,
      fundHouse: fundIdx >= 0 ? (cols[fundIdx] || "").trim() : "",
      units: unitsIdx >= 0 ? parseFloat((cols[unitsIdx] || "0").replace(/[,\s]/g, "")) || 0 : 0,
      aum,
      name: nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "",
    });
  }
  return results;
}

// ─── KFintech parser ─────────────────────────────────────────────────────────
function parseKFintech(text: string): { pan: string; folioNo: string; schemeName: string; fundHouse: string; units: number; aum: number; name: string }[] {
  const results: any[] = [];
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return results;

  const parseRow = (line: string): string[] => {
    const cols: string[] = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === "'") { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan_no");
  const aumIdx = headers.indexOf("rupee_bal");
  const nameIdx = headers.indexOf("inv_name");
  const schemeIdx = headers.indexOf("scheme_name");
  const folioIdx = headers.indexOf("folio_no");
  const unitsIdx = headers.indexOf("bal_units");
  const fundIdx = headers.indexOf("amc_code");

  if (panIdx === -1 || aumIdx === -1) return results;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseRow(line);
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue;
    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    const schemeName = schemeIdx >= 0 ? (cols[schemeIdx] || "").trim() : "";
    if (!schemeName) continue;
    results.push({
      pan,
      folioNo: folioIdx >= 0 ? (cols[folioIdx] || "").trim() : "",
      schemeName,
      fundHouse: fundIdx >= 0 ? (cols[fundIdx] || "").trim() : "",
      units: unitsIdx >= 0 ? parseFloat((cols[unitsIdx] || "0").replace(/[,\s]/g, "")) || 0 : 0,
      aum,
      name: nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "",
    });
  }
  return results;
}

function detectFileType(text: string): "cams" | "kfintech" {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0].toLowerCase();
  if (firstLine.includes("pan_no") && firstLine.includes("rupee_bal")) return "kfintech";
  return "cams";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

    // Parse all files into folio rows
    const allFolios: any[] = [];
    const fileResults: any[] = [];

    for (const file of files) {
      const text = await file.text();
      const fileType = detectFileType(text);
      const parsed = fileType === "kfintech" ? parseKFintech(text) : parseCAMS(text);
      parsed.forEach(f => { f.source = fileType === "kfintech" ? "KFINTECH" : "CAMS"; });
      allFolios.push(...parsed);
      fileResults.push({ name: file.name, type: fileType, records: parsed.length });
    }

    if (!allFolios.length) {
      return NextResponse.json({ error: "No valid folio data found in files" }, { status: 400 });
    }

    // Build PAN → total AUM map
    const panAUM: Record<string, number> = {};
    for (const f of allFolios) {
      panAUM[f.pan] = (panAUM[f.pan] || 0) + f.aum;
    }

    // Fetch all clients with PAN
    const clients = await db.client.findMany({
      where: { deletedAt: null, pan: { not: null } },
      select: { id: true, pan: true, fullName: true, aum: true, category: true },
    });

    const clientByPAN: Record<string, typeof clients[0]> = {};
    for (const c of clients) {
      if (c.pan) clientByPAN[c.pan.toUpperCase().trim()] = c;
    }

    // Update client AUM + category
    let updated = 0;
    const toUpdate = clients.filter(c => c.pan && isValidPAN(c.pan) && panAUM[c.pan.toUpperCase().trim()] !== undefined);

    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(batch.map(async (client) => {
        const pan = client.pan!.toUpperCase().trim();
        const newAUM = panAUM[pan];
        let newCategory = client.category;
        if (newAUM >= 100000000) newCategory = "ULTRA_HNI";
        else if (newAUM >= 10000000) newCategory = "HNI";
        else if (newAUM >= 5000000) newCategory = "PREMIUM";
        else newCategory = "STANDARD";
        await db.client.update({ where: { id: client.id }, data: { aum: newAUM, category: newCategory as any } });
        updated++;
      }));
    }

    // Upsert folios — delete old folios for matched clients then insert fresh
    const matchedPANs = Object.keys(panAUM).filter(pan => clientByPAN[pan]);

    if (matchedPANs.length > 0) {
      // Delete existing folios for these clients
      const clientIds = matchedPANs.map(pan => clientByPAN[pan].id);
      await db.folio.deleteMany({ where: { clientId: { in: clientIds } } });

      // Insert fresh folios
      const folioData = allFolios
        .filter(f => clientByPAN[f.pan])
        .map(f => ({
          clientId: clientByPAN[f.pan].id,
          pan: f.pan,
          folioNo: f.folioNo || null,
          schemeName: f.schemeName,
          fundHouse: f.fundHouse || null,
          units: f.units || null,
          aum: f.aum,
          source: f.source,
          updatedAt: new Date(),
        }));

      // Insert in batches of 100
      for (let i = 0; i < folioData.length; i += 100) {
        await db.folio.createMany({ data: folioData.slice(i, i + 100) });
      }
    }

    const totalAUM = toUpdate.reduce((sum, c) => sum + (panAUM[c.pan!.toUpperCase().trim()] || 0), 0);
    const totalFolios = allFolios.filter(f => clientByPAN[f.pan]).length;

    return NextResponse.json({
      success: true,
      updated,
      notFound: Object.keys(panAUM).length - toUpdate.length,
      totalAUM,
      totalFolios,
      fileResults,
      message: `Updated ${updated} clients with ${totalFolios} folios. Total AUM: ₹${(totalAUM / 10000000).toFixed(2)} Cr`,
    });
  } catch (error) {
    console.error("AUM sync error:", error);
    return NextResponse.json({ error: "Sync failed: " + String(error) }, { status: 500 });
  }
}
