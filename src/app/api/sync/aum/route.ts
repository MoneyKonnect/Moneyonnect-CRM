// src/app/api/sync/aum/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { matchClient } from "@/lib/identity/matchClient";
import { normalizeName } from "@/lib/identity/normalizeName";
import { RawSyncRow } from "@/lib/identity/types";

const prisma = new PrismaClient();

interface SyncSummary {
  newClients: number;
  updatedClients: number;
  minorsPromoted: number;
  needsReviewCount: number;
  totalAumSynced: number;
  rowsProcessed: number;
  rowsSkippedJunk: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: RawSyncRow[] = body.rows; // pre-parsed by CAMS/KFintech CSV parser upstream

  const summary: SyncSummary = {
    newClients: 0,
    updatedClients: 0,
    minorsPromoted: 0,
    needsReviewCount: 0,
    totalAumSynced: 0,
    rowsProcessed: 0,
    rowsSkippedJunk: 0,
  };

  for (const row of rows) {
    // Only skip TRUE junk: no AUM AND no identifying info whatsoever.
    // Never skip purely because PAN is blank.
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

    // Upsert folio (by amcCode + folioNumber composite)
    await prisma.folio.upsert({
      where: {
        amcCode_folioNumber: { amcCode: row.amcCode, folioNumber: row.folioNumber },
      },
      update: {
        currentAum: aum,
        holderName: row.name,
        normalizedName: normName,
        holdingNature: row.holdingNature,
        guardianName: client.guardianName ?? undefined,
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
        guardianName: client.guardianName ?? null,
        guardianPan: client.guardianPan ?? null,
        investorKey: client.investorKey,
        clientId: client.id,
        lastSyncedAt: new Date(),
      },
    });

    summary.totalAumSynced += aum;
    summary.rowsProcessed++;
  }

  return NextResponse.json({ success: true, summary });
}
