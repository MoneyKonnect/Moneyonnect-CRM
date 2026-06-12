// src/lib/identity/types.ts

export type MatchSource =
  | "PAN"
  | "GUARD_PAN"
  | "EMAIL"
  | "MOBILE"
  | "ADDRESS"
  | "CKYC"
  | "FOLIO"
  | "MANUAL"
  | "PROMOTED_FROM_MINOR";

export interface RawSyncRow {
  // raw values straight from CSV (CAMS or KFintech), already mapped to common field names
  name: string;
  pan: string | null;
  guardianPan: string | null; // CAMS GUARD_PAN, null for KFintech
  email: string | null;
  mobile: string | null;
  address1: string | null;
  pincode: string | null;
  ckyc: string | null;
  amcCode: string;
  folioNumber: string;
  aum: number;
  holdingNature: string | null;
}

export interface ResolutionResult {
  investorKey: string;
  resolvedGuardianPan: string | null;
  matchSource: MatchSource;
  needsReview: boolean;
  reviewReason: string | null;
  isMinor: boolean;
  guardianClientId: string | null;
}
