// src/app/api/sync/aum/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parseSyncFile, ParsedFolioRow } from "@/lib/identity/parseSyncFile";

const prisma = new PrismaClient();

interface SyncSummary {
  foliosCreated: number;
  foliosUpdated: number;
  clientsMatched: number;
  clientsNotFound: number;
  clientsAumUpdated: number;
  totalAumSynced: number;
  rowsProcessed: number;
  rowsSkipped: number;
  filesProcessed: { name: string; type: string; rowCount: number }[];
  significantChanges: string[];
}

function folioKey(pan: string, folioNo: string | null, schemeName: string): string {
  return `${pan}|${folioNo ?? ""}|${schemeName}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ success: false, error: "No files uploaded" }, { status: 400 });
  }

  const allRows: ParsedFolioRow[] = [];
  const filesProcessed: { name: string; type: string; rowCount: number }[] = [];
  let parseSkipped = 0;

  for (const file of files) {
    const text = await file.text();
    const parsed = parseSyncFile(text);

    if (parsed.type === "UNKNOWN") {
      return NextResponse.json(
        { success: false, error: `Could not detect file type for "${file.name}" — expected a CAMS or KFintech AUM export.` },
        { status: 400 }
      );
    }

    allRows.push(...parsed.rows);
    parseSkipped += parsed.skipped;
    filesProcessed.push({ name: file.name, type: parsed.type, rowCount: parsed.rows.length });
  }

  const summary: SyncSummary = {
    foliosCreated: 0,
    foliosUpdated: 0,
    clientsMatched: 0,
    clientsNotFound: 0,
    clientsAumUpdated: 0,
    totalAumSynced: 0,
    rowsProcessed: 0,
    rowsSkipped: parseSkipped,
    filesProcessed,
    significantChanges: [],
  };

  if (allRows.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No valid rows found in the uploaded files",
      summary,
    });
  }

  try {
  const distinctPans = Array.from(new Set(allRows.map((r) => r.pan)));

  const clients = await prisma.client.findMany({
    where: { pan: { in: distinctPans } },
    select: { id: true, pan: true },
  });
  const clientByPan = new Map<string, string>();
  for (const c of clients) {
    if (c.pan) clientByPan.set(c.pan, c.id);
  }

  const existingFolios = await prisma.folio.findMany({
    where: { pan: { in: distinctPans } },
    select: { id: true, pan: true, folioNo: true, schemeName: true, aum: true },
  });
  const folioByKey = new Map<string, { id: string; aum: number }>();
  for (const f of existingFolios) {
    folioByKey.set(folioKey(f.pan, f.folioNo, f.schemeName), { id: f.id, aum: Number(f.aum) });
  }

  const matchedPans = new Set<string>();
  const notFoundPans = new Set<string>();
  const touchedClientIds = new Set<string>();

  for (const row of allRows) {
    const clientId = clientByPan.get(row.pan) ?? null;
    if (clientId) { matchedPans.add(row.pan); touchedClientIds.add(clientId); }
    else notFoundPans.add(row.pan);

    const key = folioKey(row.pan, row.folioNo, row.schemeName);
    const existing = folioByKey.get(key);

    if (existing) {
      await prisma.folio.update({
        where: { id: existing.id },
        data: {
          fundHouse: row.fundHouse,
          units: row.units,
          aum: row.aum,
          source: row.source,
          clientId,
          updatedAt: new Date(),
        },
      });
      summary.foliosUpdated++;

      if (existing.aum > 10000 && Math.abs(row.aum - existing.aum) / existing.aum > 0.2) {
        const name = row.investorName || row.pan;
        summary.significantChanges.push(
          `${name}: ₹${existing.aum.toLocaleString("en-IN")} → ₹${row.aum.toLocaleString("en-IN")} (${row.schemeName})`
        );
      }
      folioByKey.set(key, { id: existing.id, aum: row.aum });
    } else {
      const created = await prisma.folio.create({
        data: {
          pan: row.pan,
          folioNo: row.folioNo,
          schemeName: row.schemeName,
          fundHouse: row.fundHouse,
          units: row.units,
          aum: row.aum,
          source: row.source,
          clientId,
        },
      });
      summary.foliosCreated++;
      folioByKey.set(key, { id: created.id, aum: row.aum });
    }

    summary.totalAumSynced += row.aum;
    summary.rowsProcessed++;
  }

  summary.clientsMatched = matchedPans.size;
  summary.clientsNotFound = notFoundPans.size;

  if (touchedClientIds.size > 0) {
    const sums = await prisma.folio.groupBy({
      by: ["clientId"],
      where: { clientId: { in: Array.from(touchedClientIds) } },
      _sum: { aum: true },
    });
    for (const s of sums) {
      if (!s.clientId) continue;
      await prisma.client.update({
        where: { id: s.clientId },
        data: { aum: s._sum.aum ?? 0 },
      });
      summary.clientsAumUpdated++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${summary.rowsProcessed} folios (${summary.foliosCreated} new, ${summary.foliosUpdated} updated) across ${files.length} file${files.length > 1 ? "s" : ""}`,
    summary,
  });
  } catch (err: any) {
    console.error("AUM sync DB error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || String(err),
        code: err?.code || null,
        meta: err?.meta || null,
      },
      { status: 500 }
    );
  }
}
