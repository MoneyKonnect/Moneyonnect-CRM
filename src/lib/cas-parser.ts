// CAS PDF Parser — NSDL, CDSL, CAMS+KFintech
// Client-side only

export interface InvestorInfo {
  name: string;
  pan: string;
  email?: string;
  mobile?: string;
  nsdlId?: string;
  statementDate?: string;
  statementPeriod?: string;
  totalPortfolioValue?: number;
  casType: "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN";
}

export interface MutualFund {
  folioNo: string;
  schemeName: string;
  isin: string;
  ucc?: string;
  registrar: string;
  planType: "DIRECT" | "REGULAR";
  units: number;
  avgCostPerUnit?: number;
  totalCost?: number;
  nav: number;
  navDate: string;
  currentValue: number;
  unrealisedPnL?: number;
  firstPurchaseDate?: string;
}

export interface Equity {
  isin: string;
  stockSymbol?: string;
  companyName: string;
  faceValue?: number;
  quantity: number;
  marketPrice?: number;
  value: number;
  dpName: string;
  accountType: "NSDL" | "CDSL";
  holdingType: "DIRECT" | "PMS";
  accountHolder?: string;
}

export interface Bond {
  isin: string;
  companyName: string;
  couponRate?: string;
  maturityDate?: string;
  noOfBonds?: number;
  faceValuePerBond?: number;
  value: number;
  dpName: string;
}

export interface AIF {
  isin: string;
  description: string;
  units: number;
  nav: number;
  value: number;
  dpName: string;
}

export interface PortfolioTrend {
  month: string;
  value: number;
  change?: number;
  changePct?: number;
}

export interface ParsedCAS {
  investor: InvestorInfo;
  mutualFunds: MutualFund[];
  equities: Equity[];
  bonds: Bond[];
  aif: AIF[];
  portfolioTrend: PortfolioTrend[];
  rawText?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

const PMS_BROKERS = [
  "AXIS SECURITIES", "AMBIT CAPITAL", "360 ONE", "ASK INVESTMENT",
  "MOTILAL OSWAL", "KOTAK MAHINDRA BANK", "EDELWEISS",
  "NUVAMA", "WHITE OAK", "ABAKKUS", "MARCELLUS", "CARNELIAN",
];

function isPMS(dpName: string) {
  return PMS_BROKERS.some(b => dpName.toUpperCase().includes(b));
}

function n(s: string): number {
  return parseFloat((s || "").replace(/,/g, "").replace(/[`₹]/g, "").trim()) || 0;
}

// SEBI rule: Direct plan ALWAYS contains "Direct" in name
function planType(name: string): "DIRECT" | "REGULAR" {
  return /direct/i.test(name) ? "DIRECT" : "REGULAR";
}

function detectType(text: string): "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN" {
  if (text.includes("National Securities Depository Limited") || text.includes("NSDL ID:")) return "NSDL";
  if (text.includes("Consolidated Account Summary") && (text.includes("KFINTECH") || text.includes("CAMS"))) return "CAMS_KFINTECH";
  return "UNKNOWN";
}

function parseIndianDate(s: string): Date | null {
  const M: Record<string, number> = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const p = s.toUpperCase().split("-");
  if (p.length !== 3) return null;
  const m = M[p[1]];
  if (m === undefined) return null;
  return new Date(+p[2], m, +p[0]);
}

// ── PDF text extraction ────────────────────────────────────────────────────
// Groups items by Y position to preserve row structure

async function extractText(pdf: any): Promise<string> {
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];

    // Group by Y (row), sort rows top-to-bottom, items left-to-right
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = row.map(r => r.str).join("   ").trim();
      if (line) full += line + "\n";
    }
  }
  return full;
}

// ── First purchase dates ───────────────────────────────────────────────────

function firstPurchaseDates(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const txIdx = text.search(/MUTUAL FUND FOLIOS.*?Transactions|Mutual Funds Transaction Statement/i);
  if (txIdx === -1) return out;
  const tx = text.slice(txIdx);
  const blocks = tx.split(/Folio No\s*[-–]\s*/i);
  for (const block of blocks) {
    const fm = block.match(/^([\d\/]+)/);
    if (!fm) continue;
    const folio = fm[1].trim();
    const re = /(\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4})\s+(?:Purchase|SIP|Switch.?In|Allotment|New Purchase)/gi;
    let m, best: Date | null = null, bestStr = "";
    while ((m = re.exec(block)) !== null) {
      const d = parseIndianDate(m[1]);
      if (d && (!best || d < best)) { best = d; bestStr = m[1]; }
    }
    if (bestStr) out[folio] = bestStr;
  }
  return out;
}

// ── MF parser ─────────────────────────────────────────────────────────────
// From raw text we can see exact format:
// INF209K01VF2   Aditya Birla Sun Life   1040467325   9,080.778   110.1227   10,00,000.00   165.5700   15,03,504.41   5,03,504.41
// MFBRLA0050   Digital India Fund -
//              Growth-Direct Plan

function parseMF(text: string, fpDates: Record<string, string>): MutualFund[] {
  const mfs: MutualFund[] = [];

  const start = text.indexOf("Mutual Fund Folios (F)");
  if (start === -1) return mfs;

  let end = text.indexOf("\nTransactions", start);
  if (end === -1) end = text.indexOf("Know more about your accounts", start);
  if (end === -1) end = start + 80000;

  const section = text.slice(start, end);
  const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

  // From the raw text, each MF entry looks like:
  // Line 1: "INF209K01VF2   Aditya Birla Sun Life   1040467325   9,080.778   110.1227   10,00,000.00   165.5700   15,03,504.41   5,03,504.41"
  // Line 2: "MFBRLA0050   Digital India Fund -"
  // Line 3: "Growth-Direct Plan"
  // So ISIN and folio and numbers are ALL on the same line
  // Scheme name spans line 1 (partial) + line 2 + line 3

  const isinLineRe = /\b(INF[A-Z0-9]{9})\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(isinLineRe);
    if (!isinM) continue;

    const isin = isinM[1];
    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();

    // Extract all numbers from this line — they are folio + units + avgcost + totalcost + nav + value + pnl
    // Numbers look like: 1040467325   9,080.778   110.1227   10,00,000.00   165.5700   15,03,504.41   5,03,504.41
    // Folio is a long integer (no decimal), numbers have decimals
    const folioM = afterIsin.match(/\b(\d{6,}(?:\/\d+)?)\b/);
    const folioNo = folioM ? folioM[1] : "";

    // Extract decimal numbers (units, costs, nav, value, pnl)
    const numMatches = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1]));

    // Also collect UCC and scheme name from next 2 lines
    const nextLine1 = lines[i + 1] || "";
    const nextLine2 = lines[i + 2] || "";

    // UCC is on next line, first token (like MFBRLA0050 or NOT AVAILABLE)
    const uccTokens = nextLine1.split(/\s{2,}/);
    const ucc = uccTokens[0] || "";

    // Scheme name: partial from line 1 (between ISIN and folio), + rest from next lines
    let schemeFromLine1 = afterIsin
      .replace(folioNo, "")
      .replace(/([\d,]+\.\d+)/g, "")
      .replace(/\s+/g, " ").trim();

    // Remove UCC from line 1 if present
    schemeFromLine1 = schemeFromLine1.replace(ucc, "").trim();

    // Rest of scheme name from continuation lines
    const schemeCont = uccTokens.slice(1).join(" ").trim();
    const schemeFromLine2 = nextLine2.startsWith("INF") ? "" : nextLine2.replace(/[\d,]+\.\d+/g, "").replace(/\s+/g, " ").trim();

    const schemeName = [schemeFromLine1, schemeCont, schemeFromLine2]
      .join(" ").replace(/\s+/g, " ").trim()
      // Clean up leftover artifacts
      .replace(/^[-\s]+/, "").replace(/[-\s]+$/, "");

    if (folioNo && numMatches.length >= 4) {
      const [units, avgCost, totalCost, nav, currentValue, pnl] = numMatches;
      if (units > 0 && currentValue > 0) {
        if (!mfs.find(m => m.isin === isin && m.folioNo === folioNo)) {
          // Determine registrar from "Know more" section at bottom
          const registrarSection = text.slice(text.indexOf("Folio No."), text.length);
          const folioRTAMatch = registrarSection.match(new RegExp(folioNo + "[\\s\\S]{1,200}?(CAMS|KFINTECH|KFIN)", "i"));
          const registrar = folioRTAMatch ? (folioRTAMatch[1].toUpperCase() === "KFIN" || folioRTAMatch[1].toUpperCase() === "KFINTECH" ? "KFINTECH" : "CAMS") : "CAMS";

          mfs.push({
            isin, ucc, schemeName, folioNo,
            planType: planType(schemeName),
            units, avgCostPerUnit: avgCost, totalCost,
            nav, navDate: "", currentValue,
            unrealisedPnL: pnl || undefined,
            registrar,
            firstPurchaseDate: fpDates[folioNo],
          });
        }
      }
    }
  }

  return mfs;
}

// ── NSDL Equity parser ────────────────────────────────────────────────────
// From raw text, NSDL equity line format:
// "INE216A01030   BRITANNIA INDUSTRIES LTD   1.00   120   5,204.50   6,24,540.00"
// "BRITANNIA.NSE"
// Note: "See Note" instead of price for suspended ISINs

function parseNSDLEquities(section: string, dpName: string): Equity[] {
  const equities: Equity[] = [];
  const holdingType: "DIRECT" | "PMS" = isPMS(dpName) ? "PMS" : "DIRECT";

  const eqStart = section.indexOf("Equity Shares");
  if (eqStart === -1) return equities;

  let eqEnd = section.indexOf("Sub Total", eqStart);
  if (eqEnd === -1) eqEnd = eqStart + 30000;

  const eqSection = section.slice(eqStart, eqEnd);
  const lines = eqSection.split("\n").map(l => l.trim()).filter(Boolean);

  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    // Must start with or contain an INE ISIN
    const isinM = line.match(/\b(INE[A-Z0-9]{10}|IN8[A-Z0-9]{9})\b/);
    if (!isinM) continue;

    const isin = isinM[1];
    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();

    // Stock symbol on next line (like "BRITANNIA.NSE" or "ISIN SUSPENDED")
    const nextLine = lines[k + 1] || "";
    const symbolM = nextLine.match(/^(\w+)\.(NSE|BSE)$/);
    const stockSymbol = symbolM ? symbolM[1] : undefined;
    const isSuspended = nextLine.includes("ISIN SUSPENDED");

    // Parse numbers from this line
    // Format: CompanyName   FaceValue   Qty   Price   Value
    // Price can be "See Note"
    const hasSeeNote = afterIsin.includes("See Note");

    let nums: number[];
    let companyName: string;

    if (hasSeeNote) {
      // Remove "See Note" and parse remaining numbers
      const cleaned = afterIsin.replace("See Note", "").trim();
      nums = [...cleaned.matchAll(/([\d,]+\.?\d*)/g)]
        .map(m => n(m[1]))
        .filter(v => v > 0);
      // Company name is everything before first number
      companyName = cleaned.replace(/[\d,\.]+.*/s, "").trim();
    } else {
      nums = [...afterIsin.matchAll(/([\d,]+\.?\d*)/g)]
        .map(m => n(m[1]))
        .filter(v => v > 0);
      companyName = afterIsin.replace(/[\d,\.]+.*/s, "").trim();
    }

    // Need at least: faceVal, qty, value (3 nums) or faceVal, qty, price, value (4 nums)
    if (nums.length >= 3) {
      const faceValue = nums[0];
      const quantity = nums[1];
      const marketPrice = nums.length >= 4 && !hasSeeNote ? nums[2] : undefined;
      const value = nums[nums.length - 1];

      if (value > 0) {
        equities.push({
          isin,
          stockSymbol,
          companyName: companyName.replace(/\s+/g, " ").trim(),
          faceValue,
          quantity,
          marketPrice,
          value,
          dpName,
          accountType: "NSDL",
          holdingType,
        });
      }
    }
  }

  return equities;
}

// ── CDSL Equity parser ────────────────────────────────────────────────────
// From raw text, CDSL equity line format:
// "INE117A01022   ABB INDIA LIMITED - NEW   50.000   0.000   0.000   7,229.60   3,61,480.00"
// "EQUITY SHARES OF RS. 2/-   50.000   0.000   0.000"
// "AFTER SPLIT   0.000   0.000   0.000"
// Key: quantity = first number (Current Bal), price = second-last, value = last

function parseCDSLEquities(section: string, dpName: string): Equity[] {
  const equities: Equity[] = [];
  const holdingType: "DIRECT" | "PMS" = isPMS(dpName) ? "PMS" : "DIRECT";

  const eqStart = section.indexOf("Equities (E)");
  if (eqStart === -1) return equities;

  let eqEnd = section.indexOf("Sub Total", eqStart);
  if (eqEnd === -1) eqEnd = eqStart + 30000;

  const eqSection = section.slice(eqStart, eqEnd);
  const lines = eqSection.split("\n").map(l => l.trim()).filter(Boolean);

  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    const isinM = line.match(/\b(INE[A-Z0-9]{10})\b/);
    if (!isinM) continue;

    const isin = isinM[1];
    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();

    // Collect all numbers from this line
    // Format: PartialName   CurrentBal   0.000   0.000   MarketPrice   Value
    const allNumsOnLine = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1]));

    // Company name is everything before first number
    const companyPartial = afterIsin.replace(/[\d,]+\.\d+.*/s, "").replace(/\s+/g, " ").trim();

    // Collect company name continuation from next lines (skip lines that are mostly numbers)
    let companyExtra = "";
    for (let j = k + 1; j < Math.min(k + 4, lines.length); j++) {
      const nl = lines[j];
      if (/\b(INE[A-Z0-9]{10})\b/.test(nl)) break; // next ISIN
      if (/^Sub Total/.test(nl)) break;
      // If line has mostly numbers, skip for name collection
      const textPart = nl.replace(/[\d,]+\.\d+/g, "").replace(/\s+/g, " ").trim();
      if (textPart.length > 2) companyExtra += " " + textPart;
    }

    const companyName = (companyPartial + companyExtra).replace(/\s+/g, " ").trim();

    // Need at least: qty, price, value (3 significant nums)
    const sigNums = allNumsOnLine.filter(v => v > 0);

    if (sigNums.length >= 2) {
      const quantity = sigNums[0];         // Current Balance = quantity
      const value = sigNums[sigNums.length - 1];   // Last = value
      const marketPrice = sigNums.length >= 2 ? sigNums[sigNums.length - 2] : undefined;

      if (value > 0 && quantity > 0) {
        equities.push({
          isin,
          companyName,
          quantity,
          marketPrice: marketPrice !== value ? marketPrice : undefined,
          value,
          dpName,
          accountType: "CDSL",
          holdingType,
        });
      }
    }
  }

  return equities;
}

// ── Bond parser ────────────────────────────────────────────────────────────
// From raw text:
// "INE906B07IN1   NATIONAL   5.00   31-May-2026   500   10,000.00   Not Available   50,00,000.00"
// "HIGHWAYS   Once a year"
// "AUTHORITY OF INDIA"

function parseBonds(text: string): Bond[] {
  const bonds: Bond[] = [];
  const seen = new Set<string>();

  // Find all "Corporate Bonds (C)" sections
  let searchFrom = 0;
  while (true) {
    const bondStart = text.indexOf("Corporate Bonds (C)", searchFrom);
    if (bondStart === -1) break;

    let bondEnd = text.indexOf("Sub Total", bondStart);
    if (bondEnd === -1) bondEnd = bondStart + 5000;

    const section = text.slice(bondStart, bondEnd);
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

    for (let k = 0; k < lines.length; k++) {
      const line = lines[k];
      const isinM = line.match(/\b(INE[A-Z0-9]{10})\b/);
      if (!isinM) continue;

      const isin = isinM[1];
      if (seen.has(isin)) continue;

      // Combine 3 lines for full data
      const combined = [line, lines[k+1] || "", lines[k+2] || ""].join(" ");

      // Maturity date
      const matM = combined.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);

      // Numbers: couponRate, no_of_bonds, face_value, [market_price], value
      const hasNotAvail = combined.includes("Not Available");
      const nums = [...combined.matchAll(/([\d,]+\.?\d*)/g)]
        .map(m => n(m[1]))
        .filter(v => v > 0);

      if (nums.length >= 3) {
        const value = nums[nums.length - 1];
        const noOfBonds = nums[nums.length - (hasNotAvail ? 2 : 3)];
        const faceValue = nums[nums.length - (hasNotAvail ? 3 : 4)] || undefined;

        const afterIsin = line.slice(line.indexOf(isin) + 12);
        const companyName = afterIsin.replace(/[\d,\.]+.*/s, "").trim() +
          (lines[k+2] ? " " + lines[k+2].replace(/[\d,\.]+.*/s, "").trim() : "");

        seen.add(isin);
        bonds.push({
          isin,
          companyName: companyName.replace(/\s+/g, " ").slice(0, 100),
          maturityDate: matM ? matM[1] : undefined,
          noOfBonds,
          faceValuePerBond: faceValue,
          value,
          dpName: "",
        });
      }
    }

    searchFrom = bondEnd;
  }

  return bonds;
}

// ── AIF parser ────────────────────────────────────────────────────────────
// From raw text:
// "INF0RO422058   360 ONE MULTI-STRATEGY FUND - SERIES 2   9,81,074.214   12.36   1,21,27,058.35"
// "CLASS A1 - Restricted Transferability"

function parseAIF(text: string): AIF[] {
  const aifs: AIF[] = [];
  const seen = new Set<string>();

  let searchFrom = 0;
  while (true) {
    const aifStart = text.indexOf("Alternate Investment Fund (A)", searchFrom);
    if (aifStart === -1) break;

    let aifEnd = text.indexOf("Sub Total", aifStart);
    if (aifEnd === -1) aifEnd = aifStart + 10000;

    const section = text.slice(aifStart, aifEnd);
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

    for (let k = 0; k < lines.length; k++) {
      const line = lines[k];
      // AIF ISINs start with INF (like MF) — but they appear in AIF section
      const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
      if (!isinM) continue;

      const isin = isinM[1];
      if (seen.has(isin)) continue;

      const afterIsin = line.slice(line.indexOf(isin) + 12).trim();
      const nextLine = lines[k + 1] || "";

      // Numbers: units, nav, value
      const nums = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1])).filter(v => v > 0);

      if (nums.length >= 3) {
        const units = nums[0];
        const nav = nums[1];
        const value = nums[2];

        if (value > 0) {
          const descPartial = afterIsin.replace(/[\d,]+\.\d+.*/s, "").trim();
          const descFull = (descPartial + " " + nextLine.replace(/[\d,]+\.\d+/g, "")).replace(/\s+/g, " ").trim();

          seen.add(isin);
          aifs.push({ isin, description: descFull.slice(0, 120), units, nav, value, dpName: "" });
        }
      }
    }

    searchFrom = aifEnd;
  }

  return aifs;
}

// ── Portfolio trend ───────────────────────────────────────────────────────

function parseTrend(text: string): PortfolioTrend[] {
  const trend: PortfolioTrend[] = [];
  const re = /\b((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})\s+([\d,]+\.\d+)(?:\s+([+\-][\d,]+\.\d+))?(?:\s+([+\-]\d+\.\d+))?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    trend.push({
      month: m[1],
      value: n(m[2]),
      change: m[3] ? n(m[3]) : undefined,
      changePct: m[4] ? parseFloat(m[4]) : undefined,
    });
  }
  return trend;
}

// ── Main NSDL parser ──────────────────────────────────────────────────────

function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const investor: InvestorInfo = { name: "", pan: "", casType: "NSDL" };

  const nsdlM = text.match(/NSDL ID:\s*(\d+)/);
  if (nsdlM) investor.nsdlId = nsdlM[1];

  // Name is the line after "NSDL ID: XXXXXX"
  const nsdlIdx = lines.findIndex(l => /NSDL ID:/.test(l));
  if (nsdlIdx !== -1 && lines[nsdlIdx + 1]) investor.name = lines[nsdlIdx + 1];

  const panM = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panM) investor.pan = panM[1];

  const pvM = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]?\s*([\d,]+\.?\d*)/);
  if (pvM) investor.totalPortfolioValue = n(pvM[1]);

  const periodM = text.match(/Statement for the period from ([\d\-A-Za-z]+ to [\d\-A-Za-z]+)/);
  if (periodM) investor.statementPeriod = periodM[1];

  const fpDates = firstPurchaseDates(text);
  const mutualFunds = parseMF(text, fpDates);

  // Parse equities by splitting into demat account sections
  const equities: Equity[] = [];

  // Split on demat account headers
  // Headers look like: "NSDL Demat Account\nSTANDARD CHARTERED BANK\nDP ID: ..."
  // or "CDSL Demat Account\nAMBIT CAPITAL PRIVATE LIMITED\nDP ID: ..."
  const dematSplit = text.split(/(?=(?:NSDL|CDSL) Demat Account\s)/);

  for (const section of dematSplit) {
    const isNSDL = section.startsWith("NSDL Demat Account");
    const isCDSL = section.startsWith("CDSL Demat Account");
    if (!isNSDL && !isCDSL) continue;

    // DP name is on the next non-empty line after the header
    const sLines = section.split("\n").map(l => l.trim()).filter(Boolean);
    let dpName = "";
    for (let k = 1; k < Math.min(5, sLines.length); k++) {
      const sl = sLines[k];
      // DP name: ALL CAPS words, not starting with DP/ACCOUNT/CLIENT/JOINT
      if (/^[A-Z][A-Z0-9\s\.\&\-\(\)]+$/.test(sl) &&
          !sl.startsWith("DP ") && !sl.startsWith("ACCOUNT") &&
          !sl.startsWith("CLIENT") && !sl.startsWith("JOINT") &&
          sl.length > 4) {
        dpName = sl;
        break;
      }
    }

    if (isNSDL) {
      equities.push(...parseNSDLEquities(section, dpName));
    } else {
      equities.push(...parseCDSLEquities(section, dpName));
    }
  }

  return {
    investor,
    mutualFunds,
    equities,
    bonds: parseBonds(text),
    aif: parseAIF(text),
    portfolioTrend: parseTrend(text),
  };
}

// ── CAMS+KFintech parser ──────────────────────────────────────────────────

function parseCAMS(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const investor: InvestorInfo = { name: "", pan: "", casType: "CAMS_KFINTECH" };

  const emailM = text.match(/Email Id:\s*(\S+)/i);
  if (emailM) investor.email = emailM[1];

  const eIdx = lines.findIndex(l => l.toLowerCase().startsWith("email id:"));
  if (eIdx !== -1 && lines[eIdx + 1]) investor.name = lines[eIdx + 1];

  const dateM = text.match(/As on (\d{2}-\w+-\d{4})/);
  if (dateM) investor.statementDate = dateM[1];

  const fpDates = firstPurchaseDates(text);
  const mfs: MutualFund[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;

    const isin = isinM[1];
    let folioNo = "";
    for (let k = i; k >= Math.max(0, i - 3); k--) {
      const fm = lines[k].match(/\b(\d{5,}(?:\/\d+)?)\b/);
      if (fm) { folioNo = fm[1]; break; }
    }

    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();
    const schemeRaw = afterIsin
      .replace(/\(Non.?Demat\)/gi, "")
      .replace(/[\d,]+\.\d+.*/s, "")
      .trim();

    const block = lines.slice(i, Math.min(i + 5, lines.length)).join(" ");
    const nums = [...block.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1])).filter(v => v > 0);
    const navDateM = block.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
    const registrar = /KFINTECH/.test(block) ? "KFINTECH" : "CAMS";

    if (folioNo && schemeRaw && nums.length >= 3) {
      const [cost, units, nav, value] = nums.length >= 4 ? nums : [0, ...nums];
      if (units > 0 && value > 0 && !mfs.find(m => m.isin === isin && m.folioNo === folioNo)) {
        mfs.push({
          folioNo, isin, schemeName: schemeRaw,
          planType: planType(schemeRaw),
          totalCost: cost, units, nav,
          navDate: navDateM ? navDateM[1] : "",
          currentValue: value,
          registrar: registrar as any,
          firstPurchaseDate: fpDates[folioNo],
        });
      }
    }
  }

  investor.totalPortfolioValue = mfs.reduce((s, m) => s + m.currentValue, 0);
  return { investor, mutualFunds: mfs, equities: [], bonds: [], aif: [], portfolioTrend: [] };
}

// ── Main export ───────────────────────────────────────────────────────────

export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), password }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") throw new Error("WRONG_PASSWORD");
    throw new Error("PDF_ERROR: " + e?.message);
  }

  const text = await extractText(pdf);
  const casType = detectType(text);

  let result: ParsedCAS;
  if (casType === "CAMS_KFINTECH") {
    result = parseCAMS(text);
  } else {
    result = parseNSDL(text);
    result.investor.casType = casType === "UNKNOWN" ? "UNKNOWN" : "NSDL";
  }

  result.rawText = text;
  return result;
}
