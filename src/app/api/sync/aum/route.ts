import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
function isValidPAN(pan: string): boolean { return PAN_REGEX.test(pan.trim().toUpperCase()); }

function parseCAMS(text: string) {
  const results: any[] = [];
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return results;
  const parseRow = (line: string) => { const cols: string[] = []; let cur = "", inQ = false; for (const ch of line) { if (ch === '"') { inQ = !inQ; continue; } if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; } cur += ch; } cols.push(cur.trim()); return cols; };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan");
  const aumIdx = headers.indexOf("aum");
  const schemeIdx = headers.indexOf("fund description");
  const folioIdx = headers.indexOf("folio number");
  const fundIdx = headers.indexOf("fund");
  const unitsIdx = headers.indexOf("balance");
  if (panIdx === -1 || aumIdx === -1 || schemeIdx === -1) return results;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i].trim());
    if (!cols.length) continue;
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue;
    const schemeName = (cols[schemeIdx] || "").trim();
    if (!schemeName) continue;
    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    results.push({ pan, folioNo: folioIdx >= 0 ? (cols[folioIdx] || "").trim() : "", schemeName, fundHouse: fundIdx >= 0 ? (cols[fundIdx] || "").trim() : "", units: unitsIdx >= 0 ? parseFloat((cols[unitsIdx] || "0").replace(/[,\s]/g, "")) || 0 : 0, aum, source: "CAMS" });
  }
  return results;
}

function parseKFintech(text: string) {
  const results: any[] = [];
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return results;
  const parseRow = (line: string) => { const cols: string[] = []; let cur = "", inQ = false; for (const ch of line) { if (ch === "'") { inQ = !inQ; continue; } if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; } cur += ch; } cols.push(cur.trim()); return cols; };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan_no");
  const aumIdx = headers.indexOf("rupee_bal");
  const schemeIdx = headers.indexOf("sch_name");
  const folioIdx = headers.indexOf("foliochk");
  const fundIdx = headers.indexOf("amc_code");
  const unitsIdx = headers.indexOf("clos_bal");
  if (panIdx === -1 || aumIdx === -1 || schemeIdx === -1) return results;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i].trim());
    if (!cols.length) continue;
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue;
    const schemeName = (cols[schemeIdx] || "").trim();
    if (!schemeName) continue;
    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    results.push({ pan, folioNo: folioIdx >= 0 ? (cols[folioIdx] || "").trim() : "", schemeName, fundHouse: fundIdx >= 0 ? (cols[fundIdx] || "").trim() : "", units: unitsIdx >= 0 ? parseFloat((cols[unitsIdx] || "0").replace(/[,\s]/g, "")) || 0 : 0, aum, source: "KFINTECH" });
  }
  return results;
}

function detectFileType(text: string): "cams" | "kfintech" {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0].toLowerCase();
  if (first.includes("pan_no") && first.includes("rupee_bal")) return "kfintech";
  return "cams";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

    const allFolios: any[] = [];
    const fileResults: any[] = [];

    for (const file of files) {
      const text = await file.text();
      const fileType = detectFileType(text);
      const parsed = fileType === "kfintech" ? parseKFintech(text) : parseCAMS(text);
      allFolios.push(...parsed);
      fileResults.push({ name: file.name, type: fileType, records: parsed.length });
    }

    if (!allFolios.length) return NextResponse.json({ error: "No valid folio data found in files" }, { status: 400 });

    const panAUM: Record<string, number> = {};
    for (const f of allFolios) panAUM[f.pan] = (panAUM[f.pan] || 0) + f.aum;

    const clients = await db.client.findMany({ where: { deletedAt: null, pan: { not: null } }, select: { id: true, pan: true, aum: true, category: true } });
    const clientByPAN: Record<string, any> = {};
    for (const c of clients) if (c.pan) clientByPAN[c.pan.toUpperCase().trim()] = c;

    let updated = 0;
    const toUpdate = clients.filter(c => c.pan && isValidPAN(c.pan) && panAUM[c.pan.toUpperCase().trim()] !== undefined);

    for (let i = 0; i < toUpdate.length; i += 50) {
      await Promise.all(toUpdate.slice(i, i + 50).map(async client => {
        const pan = client.pan!.toUpperCase().trim();
        const newAUM = panAUM[pan];
        let cat = newAUM >= 100000000 ? "ULTRA_HNI" : newAUM >= 10000000 ? "HNI" : newAUM >= 5000000 ? "PREMIUM" : "STANDARD";
        await db.client.update({ where: { id: client.id }, data: { aum: newAUM, category: cat as any } });
        updated++;
      }));
    }

    const matchedPANs = Object.keys(panAUM).filter(pan => clientByPAN[pan]);
    if (matchedPANs.length > 0) {
      const clientIds = matchedPANs.map(pan => clientByPAN[pan].id);
      await db.folio.deleteMany({ where: { clientId: { in: clientIds } } });
      const folioData = allFolios.filter(f => clientByPAN[f.pan]).map(f => ({
        clientId: clientByPAN[f.pan].id, pan: f.pan, folioNo: f.folioNo || null,
        schemeName: f.schemeName, fundHouse: f.fundHouse || null,
        units: f.units || null, aum: f.aum, source: f.source, updatedAt: new Date(),
      }));
      for (let i = 0; i < folioData.length; i += 100) await db.folio.createMany({ data: folioData.slice(i, i + 100) });
    }

    const totalAUM = toUpdate.reduce((s, c) => s + (panAUM[c.pan!.toUpperCase().trim()] || 0), 0);
    const totalFolios = allFolios.filter(f => clientByPAN[f.pan]).length;

    return NextResponse.json({
      success: true, updated, totalAUM, totalFolios, fileResults,
      message: `Updated ${updated} clients with ${totalFolios} folios. Total AUM: ₹${(totalAUM / 10000000).toFixed(2)} Cr`,
    });
  } catch (error) {
    console.error("AUM sync error:", error);
    return NextResponse.json({ error: "Sync failed: " + String(error) }, { status: 500 });
  }
}
