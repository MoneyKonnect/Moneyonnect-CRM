// src/lib/identity/normalizeName.ts

const HONORIFICS = new Set([
  "MR", "MRS", "MS", "MASTER", "MISS", "DR", "SHRI", "SMT", "KUM", "M/S",
]);

/**
 * Normalizes an investor name for matching purposes.
 * - Uppercase
 * - Collapse whitespace
 * - Strip trailing/leading punctuation
 * - Remove common honorifics
 *
 * Does NOT expand/strip middle initials — too risky for false positives.
 * Used for exact-match comparisons only (e.g. minor investorKey).
 */
export function normalizeName(raw: string | null | undefined): string {
  if (!raw) return "";

  let name = raw
    .toUpperCase()
    .replace(/[.,]+/g, " ") // periods/commas -> space
    .replace(/\s+/g, " ")
    .trim();

  const tokens = name.split(" ").filter((t) => !HONORIFICS.has(t));
  name = tokens.join(" ").trim();

  return name;
}

/**
 * Normalizes a PAN: uppercase, trimmed, or null if blank.
 */
export function normalizePan(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const pan = raw.trim().toUpperCase();
  return pan.length > 0 ? pan : null;
}

/**
 * Normalizes an email: lowercase, trimmed, or null if blank.
 */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

/**
 * Normalizes a mobile number: strips spaces/dashes/+91, keeps last 10 digits.
 * Returns null if fewer than 10 digits remain.
 */
export function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Normalizes an address for matching: address line 1 + pincode, uppercased & trimmed.
 */
export function normalizeAddressKey(
  address1: string | null | undefined,
  pincode: string | null | undefined
): string | null {
  const addr = (address1 || "").trim().toUpperCase();
  const pin = (pincode || "").trim();
  if (!addr || !pin) return null;
  return `${addr}|${pin}`;
}
