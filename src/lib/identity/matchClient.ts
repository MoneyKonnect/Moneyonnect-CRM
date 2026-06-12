// src/lib/identity/matchClient.ts

import { PrismaClient, Client } from "@prisma/client";
import { resolveInvestorKey } from "./resolveInvestorKey";
import { normalizeName, normalizePan } from "./normalizeName";
import { RawSyncRow } from "./types";

export interface MatchResult {
  client: Client;
  created: boolean;
  promoted: boolean;
}

/**
 * Full client matching/creation/promotion for a single CSV row.
 * Implements the priority cascade including AMC+Folio fallback (Priority 7)
 * and minor->adult promotion (Step 3).
 *
 * Never throws on unresolved identity - worst case returns a
 * needsReview=true placeholder client so AUM is never dropped.
 */
export async function matchClient(
  prisma: PrismaClient,
  row: RawSyncRow
): Promise<MatchResult> {
  const pan = normalizePan(row.pan);
  const normName = normalizeName(row.name);

  // ---- Priority 7 pre-check: AMC + Folio Number ----
  // If this exact folio already exists, use its client regardless of
  // identity-field changes (handles legacy folios with missing PAN).
  const existingFolio = await prisma.folio.findUnique({
    where: { amcCode_folioNumber: { amcCode: row.amcCode, folioNumber: row.folioNumber } },
    include: { client: true },
  });

  if (existingFolio?.client) {
    const client = existingFolio.client;

    // Check for minor -> adult promotion on this sync
    if (client.isMinor && pan) {
      const promoted = await promoteMinorToAdult(prisma, client, pan);
      return { client: promoted, created: false, promoted: true };
    }

    return { client, created: false, promoted: false };
  }

  // ---- Run the identity resolution cascade (Priorities 1-6) ----
  const resolution = await resolveInvestorKey(prisma, row);

  // Look up by resolved investorKey
  const existing = await prisma.client.findUnique({
    where: { investorKey: resolution.investorKey },
  });

  if (existing) {
    // Promotion check: existing minor record, new row now has PAN
    if (existing.isMinor && pan && resolution.matchSource !== "GUARD_PAN") {
      const promoted = await promoteMinorToAdult(prisma, existing, pan);
      return { client: promoted, created: false, promoted: true };
    }
    return { client: existing, created: false, promoted: false };
  }

  // ---- Create new client ----
  // Handle potential unique constraint race: catch and re-lookup.
  try {
    const created = await prisma.client.create({
      data: {
        name: row.name,
        pan: pan,
        email: row.email || null,
        mobile: row.mobile || null,
        investorKey: resolution.investorKey,
        isMinor: resolution.isMinor,
        guardianPan: resolution.resolvedGuardianPan,
        guardianClientId: resolution.guardianClientId,
        matchSource: resolution.matchSource,
        needsReview: resolution.needsReview,
        reviewReason: resolution.reviewReason,
      },
    });
    return { client: created, created: true, promoted: false };
  } catch (err: any) {
    if (err.code === "P2002") {
      // Unique constraint violation - another row in this sync created it first
      const racedClient = await prisma.client.findUnique({
        where: { investorKey: resolution.investorKey },
      });
      if (racedClient) {
        return { client: racedClient, created: false, promoted: false };
      }
    }
    throw err;
  }
}

/**
 * Promotes a minor client record to adult status in place.
 * - Same Client.id preserved (no data loss on Folios/AUM/relations)
 * - investorKey switches from GUARDPAN_NAME format to PAN
 * - guardianPan/guardianName/guardianClientId kept intact (historical link)
 */
async function promoteMinorToAdult(
  prisma: PrismaClient,
  client: Client,
  newPan: string
): Promise<Client> {
  const updated = await prisma.client.update({
    where: { id: client.id },
    data: {
      pan: newPan,
      investorKey: newPan,
      isMinor: false,
      matchSource: "PROMOTED_FROM_MINOR",
      promotedAt: new Date(),
      // guardianPan, guardianName, guardianClientId intentionally left intact
    },
  });

  // Update investorKey on all linked folios for consistency
  await prisma.folio.updateMany({
    where: { clientId: client.id },
    data: { investorKey: newPan },
  });

  return updated;
}
