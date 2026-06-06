import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── PAN validation — must be exactly 5 letters, 4 digits, 1 letter ──────────
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function isValidPAN(pan: string): boolean {
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

// ─── CAMS parser — standard CSV, double-quote text qualifier ─────────────────
function parseCAMS(text: string): { pan: string; aum: number; name: string }[] {
  const results: { pan: string; aum: number; name: string }[] = [];

  // Strip BOM, normalize line endings
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  if (lines.length < 2) return results;

  // Parse a CSV row respecting double-quote fields
  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan");
  const aumIdx = headers.indexOf("aum");
  const nameIdx = headers.indexOf("investor name");

  if (panIdx === -1 || aumIdx === -1) return results;

  // HashMap: PAN → { aum, name } — O(1) insert/update, O(n) total
  const panMap: Record<string, { aum: number; name: string }> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseRow(line);
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue;

    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "";

    // Sum folios for same PAN (O(1) HashMap update)
    if (panMap[pan]) {
      panMap[pan].aum += aum;
    } else {
      panMap[pan] = { aum, name };
    }
  }

  for (const [pan, data] of Object.entries(panMap)) {
    results.push({ pan, aum: data.aum, name: data.name });
  }

  return results;
}

// ─── KFintech parser — single-quote text qualifier (non-standard RTA format) ──
// The key insight: addresses contain commas, so they are wrapped in single quotes
// e.g. 'FLAT NO A-T02, 21 KM KANAKPURA, ROAD, BANGALORE'
// Stripping quotes first destroys this protection → columns shift → PAN gets garbage
// Solution: treat ' as the quotechar, exactly like Python's csv.DictReader(quotechar="'")
function parseKFintech(text: string): { pan: string; aum: number; name: string }[] {
  const results: { pan: string; aum: number; name: string }[] = [];

  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  if (lines.length < 2) return results;

  // Parse a row where SINGLE QUOTE is the text qualifier
  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === "'") { inQ = !inQ; continue; }  // single quote = field boundary
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const panIdx = headers.indexOf("pan_no");
  const aumIdx = headers.indexOf("rupee_bal");
  const nameIdx = headers.indexOf("inv_name");

  if (panIdx === -1 || aumIdx === -1) return results;

  // HashMap: PAN → { aum, name } — O(1) insert/update, O(n) total
  const panMap: Record<string, { aum: number; name: string }> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseRow(line);
    const pan = (cols[panIdx] || "").trim().toUpperCase();
    if (!isValidPAN(pan)) continue; // Skips phone numbers, names, garbage in PAN column

    const aum = parseFloat((cols[aumIdx] || "0").replace(/[₹,\s]/g, "")) || 0;
    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "";

    // Sum folios for same PAN (O(1) HashMap update)
    if (panMap[pan]) {
      panMap[pan].aum += aum;
    } else {
      panMap[pan] = { aum, name };
    }
  }

  for (const [pan, data] of Object.entries(panMap)) {
    results.push({ pan, aum: data.aum, name: data.name });
  }

  return results;
}

// ─── Detect which file type we're dealing with ────────────────────────────────
function detectFileType(text: string): "cams" | "kfintech" | "unknown" {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0].toLowerCase();
  // KFintech always has single-quoted headers and PAN_NO column
  if (firstLine.includes("pan_no") && firstLine.includes("rupee_bal")) return "kfintech";
  // CAMS has PAN and AUM columns, no single quotes on headers
  if (firstLine.includes('"pan"') || (firstLine.includes("pan") && firstLine.includes("aum"))) return "cams";
  // Check for single quote wrapping (KFintech signature)
  if (firstLine.startsWith("'")) return "kfintech";
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

    // ── Step 1: Parse all files → build master HashMap PAN → AUM ──────────────
    // HashMap gives O(1) lookup when merging CAMS + KFintech for same PAN
    const masterPAN: Record<string, number> = {};
    const masterName: Record<string, string> = {};
    const fileResults: { name: string; type: string; records: number; totalAUM: number }[] = [];

    for (const file of files) {
      const text = await file.text();
      const fileType = detectFileType(text);

      let parsed: { pan: string; aum: number; name: string }[] = [];

      if (fileType === "cams") {
        parsed = parseCAMS(text);
      } else if (fileType === "kfintech") {
        parsed = parseKFintech(text);
      } else {
        fileResults.push({ name: file.name, type: "unknown", records: 0, totalAUM: 0 });
        continue;
      }

      let fileTotalAUM = 0;
      for (const { pan, aum, name } of parsed) {
        // Merge: same PAN across CAMS + KFintech → add AUMs (O(1) HashMap)
        masterPAN[pan] = (masterPAN[pan] || 0) + aum;
        if (name && !masterName[pan]) masterName[pan] = name;
        fileTotalAUM += aum;
      }

      fileResults.push({
        name: file.name,
        type: fileType,
        records: parsed.length,
        totalAUM: fileTotalAUM,
      });
    }

    const uniquePANs = Object.keys(masterPAN);
    if (!uniquePANs.length) {
      return NextResponse.json({
        error: `No valid AUM data found. File info: ${fileResults.map((f) => `${f.name} (detected: ${f.type})`).join(", ")}`,
      }, { status: 400 });
    }

    // ── Step 2: Fetch CRM clients with PAN, update AUM ────────────────────────
    const clients = await db.client.findMany({
      where: { deletedAt: null, pan: { not: null } },
      select: { id: true, pan: true, fullName: true, aum: true, category: true },
    });

    const updateLog: string[] = [];
    let updated = 0;

    // Filter clients that have a matching PAN in our master map
    const toUpdate = clients.filter(
      (c) => c.pan && isValidPAN(c.pan) && masterPAN[c.pan.toUpperCase().trim()] !== undefined
    );

    // Batch DB updates — 50 at a time
    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (client) => {
          const pan = client.pan!.toUpperCase().trim();
          const newAUM = masterPAN[pan];
          const oldAUM = client.aum ? Number(client.aum) : 0;

          // Auto-categorize based on AUM
          let newCategory = client.category;
          if (newAUM >= 100000000)      newCategory = "ULTRA_HNI"; // 1 Cr+
          else if (newAUM >= 10000000)  newCategory = "HNI";       // 10L+
          else if (newAUM >= 5000000)   newCategory = "PREMIUM";   // 5L+
          else                          newCategory = "STANDARD";

          await db.client.update({
            where: { id: client.id },
            data: { aum: newAUM, category: newCategory as any },
          });

          updated++;
          if (Math.abs(newAUM - oldAUM) > 10000) {
            updateLog.push(
              `${client.fullName}: ₹${(oldAUM / 100000).toFixed(1)}L → ₹${(newAUM / 100000).toFixed(1)}L`
            );
          }
        })
      );
    }

    const notFound = uniquePANs.filter((p) => !clients.some((c) => c.pan?.toUpperCase().trim() === p)).length;
    const totalAUM = toUpdate.reduce((sum, c) => sum + (masterPAN[c.pan!.toUpperCase().trim()] || 0), 0);

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
    return NextResponse.json({ error: "Sync failed: " + String(error) }, { status: 500 });
  }
}
