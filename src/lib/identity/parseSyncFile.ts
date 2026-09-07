// src/lib/identity/parseSyncFile.ts
//
// Parses raw CAMS or KFintech AUM-export CSV text into rows matching the
// REAL Folio schema (pan, folioNo, schemeName, fundHouse, units, aum, source).
// Auto-detects file type from the header row.
//
// KFintech: fields individually single-quote wrapped (numeric fields bare).
// CAMS: standard RFC4180 CSV (double-quote qualified).
//
// NOTE: Folio.pan is required (non-nullable). For KFintech rows with no
// PAN_NO (typically minors), we fall back to GUARD_PAN so the row can
// still be saved — pragmatic given the DB has no minor/guardian schema
// today. CAMS has no guardian-PAN column at all, so CAMS rows with no
// PAN are skipped (counted in `skipped`). Rows with no scheme name are
// also skipped since schemeName is required on Folio too.

export type SyncFileType = "KFINTECH" | "CAMS" | "UNKNOWN";

export interface ParsedFolioRow {
  pan: string;
  folioNo: string | null;
  schemeName: string;
  fundHouse: string | null;
  units: number | null;
  aum: number;
  source: "CAMS" | "KFINTECH";
  investorName: string; // not persisted — used only for response messages
}

export interface ParsedFileResult {
  type: SyncFileType;
  rows: ParsedFolioRow[];
  skipped: number;
}

function parseKfintechLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'") {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseKfintechTable(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseKfintechLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseKfintechLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    return row;
  });
}

function parseRfc4180(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

function detectType(text: string): SyncFileType {
  const firstLine = text.split(/\r?\n/)[0] || "";
  if (firstLine.includes("FOLIOCHK") && firstLine.includes("INV_NAME")) return "KFINTECH";
  if (firstLine.includes("Folio Number") && firstLine.includes("Investor Name")) return "CAMS";
  return "UNKNOWN";
}

function toValueOrNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

function mapKfintechRow(r: Record<string, string>): ParsedFolioRow | null {
  const pan = toValueOrNull(r["PAN_NO"]) ?? toValueOrNull(r["GUARD_PAN"]);
  const schemeName = (r["SCH_NAME"] || "").trim();
  if (!pan || !schemeName) return null;

  const units = parseFloat(r["CLOS_BAL"]);
  const aum = parseFloat(r["RUPEE_BAL"]);

  return {
    pan,
    folioNo: toValueOrNull(r["FOLIOCHK"]),
    schemeName,
    fundHouse: toValueOrNull(r["AMC_CODE"]),
    units: isNaN(units) ? null : units,
    aum: isNaN(aum) ? 0 : aum,
    source: "KFINTECH",
    investorName: (r["INV_NAME"] || "").trim(),
  };
}

function mapCamsRow(r: Record<string, string>): ParsedFolioRow | null {
  const pan = toValueOrNull(r["PAN"]);
  const schemeName = (r["Fund Description"] || "").trim();
  if (!pan || !schemeName) return null;

  const units = parseFloat(r["Balance"]);
  const aum = parseFloat(r["AUM"]);

  return {
    pan,
    folioNo: toValueOrNull(r["Folio Number"]),
    schemeName,
    fundHouse: toValueOrNull(r["Fund"]),
    units: isNaN(units) ? null : units,
    aum: isNaN(aum) ? 0 : aum,
    source: "CAMS",
    investorName: (r["Investor Name"] || "").trim(),
  };
}

export function parseSyncFile(text: string): ParsedFileResult {
  const type = detectType(text);
  if (type === "UNKNOWN") return { type, rows: [], skipped: 0 };

  const records = type === "KFINTECH" ? parseKfintechTable(text) : parseRfc4180(text);
  const mapFn = type === "KFINTECH" ? mapKfintechRow : mapCamsRow;

  const rows: ParsedFolioRow[] = [];
  let skipped = 0;
  for (const r of records) {
    const mapped = mapFn(r);
    if (mapped) rows.push(mapped);
    else skipped++;
  }

  return { type, rows, skipped };
}
