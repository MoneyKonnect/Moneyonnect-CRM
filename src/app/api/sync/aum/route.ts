// src/app/api/sync/aum/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { matchClient } from "@/lib/identity/matchClient";
import { normalizeName } from "@/lib/identity/normalizeName";
import { RawSyncRow } from "@/lib/identity/types";
import { parseSyncFile } from "@/lib/identity/parseSyncFile";

const prisma = new PrismaClient();

interface SyncSummary {
  newClients: number;
  updatedClients: number;
  minorsPromoted: number;
  needsReviewCount: number;
  totalAumSynced: number;
  rowsProcessed: number;
  rowsSkippedJunk: number;
  filesProcessed: { name: string; type: string; rowCount: number }[];
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ success: false, error: "No files uploaded" }, { status: 400 });
  }

  const allRows: RawSyncRow[] = [];
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
    newClients: 0,
    updatedClients: 0,
    minorsPromoted: 0,
    needsReviewCount: 0,
    totalAumSynced: 0,
    rowsProcessed: 0,
    rowsSkippedJunk: parseSkipped,
    filesProcessed,
  };

  for (const row of allRows) {
    const hasAnyIdentity =
      row.pan || row.guardianPan || row.email || row.mobile || row.folioNumber;
    if ((row.aum === null || row.aum === undefined || isNaN(row.aum)) && !hasAnyIdentity) {
      summary.rowsSkippedJunk++;
      continue;
    }

    const aum = row.aum || 0;
    const normName = normalizeName(row.name);
    const { client, created, promoted } = await matchClient(prisma, row);

    if (created) summary.newClients++;
    else summary.updatedClients++;
    if (promoted) summary.minorsPromoted++;
    if (client.needsReview) summary.needsReviewCount++;

    await prisma.folio.upsert({
      where: {
        amcCode_folioNumber: { amcCode: row.amcCode, folioNumber: row.folioNumber },
      },
      update: {
        currentAum: aum,
        holderName: row.name,
        normalizedName: normName,
        holdingNature: row.holdingNature,
        guardianPan: client.guardianPan ?? undefined,
        investorKey: client.investorKey,
        clientId: client.id,
        lastSyncedAt: new Date(),
      },
      create: {
        amcCode: row.amcCode,
        folioNumber: row.folioNumber,
        currentAum: aum,
        holderName: row.name,
        normalizedName: normName,
        holdingNature: row.holdingNature,
        guardianPan: client.guardianPan ?? null,
        investorKey: client.investorKey,
        clientId: client.id,
        lastSyncedAt: new Date(),
      },
    });

    summary.totalAumSynced += aum;
    summary.rowsProcessed++;
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${summary.rowsProcessed} rows across ${files.length} file${files.length > 1 ? "s" : ""}`,
    summary,
  });
}
