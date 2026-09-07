// src/lib/identity/parseSyncFile.ts
//
// Parses raw CAMS or KFintech AUM-export CSV text into RawSyncRow[].
// Auto-detects file type from the header row so either file can be
// dropped in any order/combination.
//
// KFintech quirk: fields are individually wrapped in single quotes
// (numeric fields left bare) — NOT the RFC4180 double-quote convention.
// CAMS: standard RFC4180 CSV (double-quote qualified, "" escapes a
// literal quote). Both parsed with small dependency-free parsers below
// rather than adding a new package.
//
// NOTE: guardianPan is a KFintech-only field (GUARD_PAN column). The
// CAMS AUM export has no guardian-PAN column at all — always null for
// CAMS rows.

import { RawSyncRow } from "./types";

export type SyncFileType = "KFINTECH" | "CAMS" | "UNKNOWN";

export interface ParsedFileResult {
  type: SyncFileType;
  rows: RawSyncRow[];
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

function mapKfintechRow(r: Record<string, string>): RawSyncRow {
  const aum = parseFloat(r["RUPEE_BAL"]);
  return {
    name: (r["INV_NAME"] || "").trim(),
    pan: toValueOrNull(r["PAN_NO"]),
    guardianPan: toValueOrNull(r["GUARD_PAN"]),
    email: toValueOrNull(r["EMAIL"]),
    mobile: toValueOrNull(r["PHONE_RES"]) ?? toValueOrNull(r["PHONE_OFF"]),
    address1: toValueOrNull(r["ADDRESS1"]),
    pincode: toValueOrNull(r["PINCODE"]),
    ckyc: toValueOrNull(r["FH_CKYC_NO"]),
    amcCode: (r["AMC_CODE"] || "").trim(),
    folioNumber: (r["FOLIOCHK"] || "").trim(),
    aum: isNaN(aum) ? 0 : aum,
    holdingNature: toValueOrNull(r["HOLDING_NATURE"]),
  };
}

function mapCamsRow(r: Record<string, string>): RawSyncRow {
  const aum = parseFloat(r["AUM"]);
  return {
    name: (r["Investor Name"] || "").trim(),
    pan: toValueOrNull(r["PAN"]),
    guardianPan: null,
    email: toValueOrNull(r["Email"]),
    mobile: toValueOrNull(r["Mobile No"]),
    address1: toValueOrNull(r["Address #1"]),
    pincode: toValueOrNull(r["Pincode"]),
    ckyc: null,
    amcCode: (r["Fund"] || "").trim(),
    folioNumber: (r["Folio Number"] || "").trim(),
    aum: isNaN(aum) ? 0 : aum,
    holdingNature: toValueOrNull(r["Hold Mode"]),
  };
}

export function parseSyncFile(text: string): ParsedFileResult {
  const type = detectType(text);
  if (type === "UNKNOWN") return { type, rows: [], skipped: 0 };

  const records = type === "KFINTECH" ? parseKfintechTable(text) : parseRfc4180(text);
  const mapped = records.map(type === "KFINTECH" ? mapKfintechRow : mapCamsRow);

  const rows = mapped.filter((row) => row.folioNumber.length > 0);
  const skipped = mapped.length - rows.length;

  return { type, rows, skipped };
}
