// src/lib/identity/resolveInvestorKey.ts

import { PrismaClient } from "@prisma/client";
import {
  normalizeName,
  normalizePan,
  normalizeEmail,
  normalizeMobile,
  normalizeAddressKey,
} from "./normalizeName";
import { RawSyncRow, ResolutionResult, MatchSource } from "./types";

/**
 * Resolves an investorKey for a CSV row using the matching cascade:
 * 1. PAN
 * 2. Guardian PAN (CAMS) + normalized name
 * 3. Email -> resolve guardian PAN
 * 4. Mobile -> resolve guardian PAN
 * 5. Address+Pincode -> resolve guardian PAN (single PAN holder only)
 * 6. CKYC (rarely populated, kept for completeness)
 * 7. AMC+Folio fallback handled separately by matchClient (not here)
 *
 * If nothing resolves confidently, returns needsReview=true with a
 * synthetic investorKey so the row is never silently dropped.
 */
export async function resolveInvestorKey(
  prisma: PrismaClient,
  row: RawSyncRow
): Promise<ResolutionResult> {
  const pan = normalizePan(row.pan);
  const guardPan = normalizePan(row.guardianPan);
  const email = normalizeEmail(row.email);
  const mobile = normalizeMobile(row.mobile);
  const normName = normalizeName(row.name);
  const addrKey = normalizeAddressKey(row.address1, row.pincode);

  // ---- Priority 1: PAN ----
  if (pan) {
    return {
      investorKey: pan,
      resolvedGuardianPan: null,
      matchSource: "PAN",
      needsReview: false,
      reviewReason: null,
      isMinor: false,
      guardianClientId: null,
    };
  }

  // ---- Priority 2: Guardian PAN (CAMS explicit) + normalized name ----
  if (guardPan) {
    const guardianClient = await prisma.client.findFirst({
      where: { pan: guardPan },
      select: { id: true, name: true },
    });

    return {
      investorKey: `${guardPan}_${normName}`,
      resolvedGuardianPan: guardPan,
      matchSource: "GUARD_PAN",
      needsReview: !guardianClient, // flag if guardian not in DB yet
      reviewReason: guardianClient ? null : "GUARDIAN_NOT_FOUND",
      isMinor: true,
      guardianClientId: guardianClient?.id ?? null,
    };
  }

  // ---- Priority 3: Email -> resolve guardian PAN ----
  if (email) {
    const candidates = await prisma.client.findMany({
      where: { email, pan: { not: null } },
      select: { id: true, pan: true, name: true },
    });

    const uniquePans = Array.from(new Set(candidates.map((c) => c.pan)));
    if (uniquePans.length === 1 && uniquePans[0]) {
      const resolvedPan = uniquePans[0];
      const guardianClient = candidates.find((c) => c.pan === resolvedPan)!;
      return {
        investorKey: `${resolvedPan}_${normName}`,
        resolvedGuardianPan: resolvedPan,
        matchSource: "EMAIL",
        needsReview: false,
        reviewReason: null,
        isMinor: true,
        guardianClientId: guardianClient.id,
      };
    }
    // ambiguous (0 or 2+ unique PANs) -> fall through to next priority
  }

  // ---- Priority 4: Mobile -> resolve guardian PAN ----
  if (mobile) {
    const candidates = await prisma.client.findMany({
      where: { mobile, pan: { not: null } },
      select: { id: true, pan: true, name: true },
    });

    const uniquePans = Array.from(new Set(candidates.map((c) => c.pan)));
    if (uniquePans.length === 1 && uniquePans[0]) {
      const resolvedPan = uniquePans[0];
      const guardianClient = candidates.find((c) => c.pan === resolvedPan)!;
      return {
        investorKey: `${resolvedPan}_${normName}`,
        resolvedGuardianPan: resolvedPan,
        matchSource: "MOBILE",
        needsReview: false,
        reviewReason: null,
        isMinor: true,
        guardianClientId: guardianClient.id,
      };
    }
  }

  // ---- Priority 5: Address+Pincode -> resolve guardian PAN (single holder only) ----
  if (addrKey) {
    const [address1, pincode] = addrKey.split("|");
    const candidates = await prisma.client.findMany({
      where: {
        pan: { not: null },
        address1: { equals: address1, mode: "insensitive" },
        pincode,
      },
      select: { id: true, pan: true, name: true },
    });

    const uniquePans = Array.from(new Set(candidates.map((c) => c.pan)));
    if (uniquePans.length === 1 && uniquePans[0]) {
      const resolvedPan = uniquePans[0];
      const guardianClient = candidates.find((c) => c.pan === resolvedPan)!;
      return {
        investorKey: `${resolvedPan}_${normName}`,
        resolvedGuardianPan: resolvedPan,
        matchSource: "ADDRESS",
        needsReview: true, // always flag address-based matches for confirmation
        reviewReason: "ADDRESS_MATCH_UNCONFIRMED",
        isMinor: true,
        guardianClientId: guardianClient.id,
      };
    }
  }

  // ---- Priority 6: CKYC ----
  if (row.ckyc) {
    const ckycMatch = await prisma.client.findFirst({
      where: { ckyc: row.ckyc },
      select: { id: true, pan: true, investorKey: true },
    });
    if (ckycMatch?.investorKey) {
      return {
        investorKey: ckycMatch.investorKey,
        resolvedGuardianPan: ckycMatch.pan ?? null,
        matchSource: "CKYC" as MatchSource,
        needsReview: false,
        reviewReason: null,
        isMinor: false,
        guardianClientId: null,
      };
    }
  }

  // ---- Nothing resolved: synthetic key, needs review ----
  // AMC+Folio fallback (Priority 7) is checked by matchClient before this
  // function is even called, in the full cascade order.
  const syntheticKey = `UNRESOLVED_${row.amcCode}_${row.folioNumber}`;
  return {
    investorKey: syntheticKey,
    resolvedGuardianPan: null,
    matchSource: "MANUAL",
    needsReview: true,
    reviewReason: "UNRESOLVED_IDENTITY",
    isMinor: false,
    guardianClientId: null,
  };
}
