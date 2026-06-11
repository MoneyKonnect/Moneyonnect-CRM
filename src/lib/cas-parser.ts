// CAS PDF Parser — NSDL, CDSL, CAMS+KFintech
// Client-side only, no external API

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

// Direct plan ALWAYS contains the word "Direct" per SEBI rules
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

// ── first purchase dates from transactions ─────────────────────────────────

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

// ── PDF text extraction with line preservation ────────────────────────────

async function extractText(pdf: any): Promise<string> {
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];

    // Group items by Y position (same row = within 3px)
    const rows: Map<number, { x: number; str: string }[]> = new Map();
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    // Sort rows top-to-bottom, items left-to-right within each row
    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);
      full += rowItems.map(r => r.str).join(" ") + "\n";
    }
  }
  return full;
}

// ── MF parser — scans for INF ISINs ───────────────────────────────────────
// Uses LINE-based parsing since text is now properly line-separated

function parseMF(text: string, fpDates: Record<string, string>): MutualFund[] {
  const mfs: MutualFund[] = [];

  const start = text.indexOf("Mutual Fund Folios (F)");
  if (start === -1) return mfs;

  // End before Transactions section
  let end = text.indexOf("\nTransactions", start);
  if (end === -1) end = text.indexOf("Know more about your accounts", start);
  if (end === -1) end = start + 60000;

  const section = text.slice(start, end);
  const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

  // Each MF entry spans multiple lines:
  // Line with ISIN: "INF209K01VF2 MFBRLA0050 Aditya Birla Sun Life Digital India Fund - Growth-Direct Plan"
  // or split across lines. Key insight: ISIN is always 12 chars starting with INF

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Find ISIN in this line
    const isinMatch = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinMatch) { i++; continue; }

    const isin = isinMatch[1];

    // Everything on this line after ISIN is UCC + start of scheme name
    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();
    const tokens = afterIsin.split(/\s+/);

    // First token after ISIN is UCC (alphanumeric, no spaces)
    const ucc = tokens[0] || "";
    let schemeParts = tokens.slice(1);

    // Collect more scheme name from next lines until we hit a folio number or another ISIN
    let j = i + 1;
    while (j < Math.min(i + 5, lines.length)) {
      const nextLine = lines[j];
      // Stop if next line has an ISIN
      if (/\bINF[A-Z0-9]{9}\b/.test(nextLine)) break;
      // Stop if next line looks like a folio number (all digits, possibly with /)
      if (/^\d{6,}(\/\d+)?$/.test(nextLine.trim())) break;
      // Stop if next line is all numbers (the data row)
      if (/^[\d,\.\s\+\-]+$/.test(nextLine.trim()) && nextLine.trim().length > 5) break;
      schemeParts.push(...nextLine.split(/\s+/));
      j++;
    }

    // Now find folio number — look in current and next few lines
    let folioNo = "";
    const fullBlock = lines.slice(i, Math.min(i + 8, lines.length)).join(" ");

    // Folio patterns: 1040467325, 6584942, 10685705, 487138492163, 5000004380/0
    const folioMatch = fullBlock.match(/\b(\d{6,}(?:\/\d+)?)\b/);
    if (folioMatch) folioNo = folioMatch[1];

    // Build scheme name — stop at folio number
    const schemeNameRaw = schemeParts.join(" ");
    // Remove folio from scheme name if it got mixed in
    const schemeName = schemeNameRaw.replace(/\b\d{6,}(\/\d+)?\b/, "").replace(/\s+/g, " ").trim();

    // Find numbers: units, avgCost, totalCost, nav, currentValue, unrealisedPnL
    // They appear after the folio in the same block
    const numRegex = /([\d,]+\.\d+)/g;
    let numMatch;
    const nums: number[] = [];
    const searchBlock = lines.slice(i, Math.min(i + 10, lines.length)).join(" ");
    // Skip past the folio number area
    const folioIdx = folioNo ? searchBlock.indexOf(folioNo) : 0;
    const numsStr = folioIdx > 0 ? searchBlock.slice(folioIdx + folioNo.length) : searchBlock;

    while ((numMatch = numRegex.exec(numsStr)) !== null && nums.length < 6) {
      nums.push(n(numMatch[1]));
    }

    if (folioNo && schemeName && nums.length >= 4) {
      const [units, avgCost, totalCost, nav, currentValue, pnl] = nums;
      if (units > 0 && currentValue > 0) {
        if (!mfs.find(m => m.isin === isin && m.folioNo === folioNo)) {
          mfs.push({
            isin, ucc, schemeName, folioNo,
            planType: planType(schemeName),
            units, avgCostPerUnit: avgCost, totalCost,
            nav, navDate: "", currentValue,
            unrealisedPnL: pnl || undefined,
            registrar: "CAMS",
            firstPurchaseDate: fpDates[folioNo],
          });
        }
      }
    }

    i = j;
  }

  return mfs;
}

// ── EQUITY parser — completely separate from MF, scans for INE ISINs ──────

function parseEquities(text: string): Equity[] {
  const equities: Equity[] = [];

  // Split into demat account sections
  // Each section starts with "NSDL Demat Account" or "CDSL Demat Account"
  const sections = text.split(/(?=(?:NSDL|CDSL) Demat Account)/);

  for (const section of sections) {
    const isNSDL = section.startsWith("NSDL Demat Account");
    const isCDSL = section.startsWith("CDSL Demat Account");
    if (!isNSDL && !isCDSL) continue;

    const accountType: "NSDL" | "CDSL" = isNSDL ? "NSDL" : "CDSL";

    // Extract DP/broker name
    // It's the line after "NSDL Demat Account" / "CDSL Demat Account"
    const sectionLines = section.split("\n").map(l => l.trim()).filter(Boolean);
    let dpName = "";
    for (let k = 1; k < Math.min(6, sectionLines.length); k++) {
      const l = sectionLines[k];
      // DP name is ALL CAPS, not starting with DP ID or ACCOUNT
      if (/^[A-Z][A-Z\s\.\&\-]+$/.test(l) && !l.startsWith("DP ID") && !l.startsWith("ACCOUNT") && !l.startsWith("CLIENT")) {
        dpName = l;
        break;
      }
    }
    const holdingType: "DIRECT" | "PMS" = isPMS(dpName) ? "PMS" : "DIRECT";

    // Find Equity Shares section within this demat section
    const eqStart = section.indexOf("Equity Shares");
    if (eqStart === -1) continue;

    // End at Sub Total or next section header
    let eqEnd = section.indexOf("Sub Total", eqStart);
    if (eqEnd === -1) eqEnd = eqStart + 20000;

    const eqSection = section.slice(eqStart, eqEnd);
    const eqLines = eqSection.split("\n").map(l => l.trim()).filter(Boolean);

    if (isNSDL) {
      // NSDL format per line:
      // "INE216A01030 BRITANNIA.NSE BRITANNIA INDUSTRIES LTD 1.00 120 5,204.50 6,24,540.00"
      // Sometimes split across 2 lines: ISIN+Symbol on line 1, rest on line 2
      let k = 0;
      while (k < eqLines.length) {
        const line = eqLines[k];
        const isinMatch = line.match(/\b(INE[A-Z0-9]{10})\b/);
        if (!isinMatch) { k++; continue; }

        const isin = isinMatch[1];
        // Combine this line + next line for full row data
        const combined = line + " " + (eqLines[k + 1] || "");

        // Stock symbol: word.NSE or word.BSE or "ISIN SUSPENDED"
        const symbolMatch = combined.match(/\b(\w+)\.(?:NSE|BSE)\b/);
        const stockSymbol = symbolMatch ? symbolMatch[1] : undefined;

        // Numbers at end: faceValue qty price value
        // "See Note" means price not available
        const numParts = combined.match(/([\d,]+\.?\d*)\s+([\d,]+)\s+([\d,]+\.?\d*|See Note)\s+([\d,]+\.\d+)$/);

        if (numParts) {
          const value = n(numParts[4]);
          if (value > 0) {
            // Company name is between symbol and first number
            let companyName = combined
              .replace(isin, "")
              .replace(symbolMatch ? symbolMatch[0] : "", "")
              .replace(/[\d,]+\.?\d*\s+[\d,]+\s+(?:[\d,]+\.?\d*|See Note)\s+[\d,]+\.\d+.*/, "")
              .replace(/\s+/g, " ").trim();

            equities.push({
              isin, stockSymbol, companyName,
              faceValue: n(numParts[1]),
              quantity: n(numParts[2]),
              marketPrice: numParts[3] === "See Note" ? undefined : n(numParts[3]),
              value,
              dpName, accountType, holdingType,
            });
          }
        }
        k += 2;
      }
    }

    if (isCDSL) {
      // CDSL format is different — has balance columns
      // "INE117A01022 ABB INDIA LIMITED ... 50.000 50.000 0.000 ... 7,229.60 3,61,480.00"
      // Key: last two numbers are marketPrice and value
      let k = 0;
      while (k < eqLines.length) {
        const line = eqLines[k];
        const isinMatch = line.match(/\b(INE[A-Z0-9]{10})\b/);
        if (!isinMatch) { k++; continue; }

        const isin = isinMatch[1];
        // Combine up to 3 lines for CDSL (multi-line security names)
        const combined = [line, eqLines[k+1] || "", eqLines[k+2] || ""].join(" ");

        // Find all numbers
        const allNums = [...combined.matchAll(/([\d,]+\.\d{2,})/g)].map(m => n(m[1]));

        // In CDSL: quantity is the first number (Current Bal), then many 0.000s, then price, then value
        // Filter out the 0.000 balance columns
        const sigNums = allNums.filter(n => n > 0);

        if (sigNums.length >= 2) {
          const quantity = sigNums[0];
          const marketPrice = sigNums[sigNums.length - 2];
          const value = sigNums[sigNums.length - 1];

          if (value > 0 && quantity > 0) {
            // Company name: everything between ISIN and first number
            const afterIsin = combined.slice(combined.indexOf(isin) + 12);
            const companyName = afterIsin.replace(/[\d,\.]+.*/s, "").replace(/#.*/, "").replace(/\s+/g, " ").trim();

            equities.push({
              isin, companyName, quantity, marketPrice, value,
              dpName, accountType: "CDSL", holdingType,
            });
          }
        }
        k += 3;
      }
    }
  }

  return equities;
}

// ── BOND parser ────────────────────────────────────────────────────────────

function parseBonds(text: string): Bond[] {
  const bonds: Bond[] = [];
  const seen = new Set<string>();

  // Bond ISINs start with INE, in Corporate Bonds sections
  // Each bond line: "INE906B07IN1 NATIONAL HIGHWAYS... 5.00 Once a year 31-May-2026 500 10,000.00 Not Available 50,00,000.00"
  const bondSections = text.split(/Corporate Bonds \(C\)/);

  for (const section of bondSections.slice(1)) {
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
    let k = 0;
    while (k < lines.length) {
      const line = lines[k];
      const isinMatch = line.match(/\b(INE[A-Z0-9]{10})\b/);
      if (!isinMatch) { k++; continue; }

      const isin = isinMatch[1];
      if (seen.has(isin)) { k++; continue; }

      // Combine several lines
      const combined = lines.slice(k, Math.min(k + 6, lines.length)).join(" ");

      // Maturity date
      const maturityMatch = combined.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
      const maturityDate = maturityMatch ? maturityMatch[1] : undefined;

      // No of bonds
      const bondsMatch = combined.match(/(\d[\d,]*)\s+[\d,]+\.?\d*\s+(?:Not Available|[\d,]+\.?\d*)\s+([\d,]+\.\d+)/);
      if (bondsMatch) {
        const value = n(bondsMatch[2]);
        if (value > 0) {
          // Company name: after ISIN, before numbers
          const afterIsin = combined.slice(combined.indexOf(isin) + 12).trim();
          const companyName = afterIsin.replace(/[\d\.]+\s+(?:Fixed|Variable|Once|Four|Twice|Half|Monthly|annually?).*/i, "").trim();

          seen.add(isin);
          bonds.push({
            isin,
            companyName: companyName.replace(/\s+/g, " ").slice(0, 80),
            maturityDate,
            noOfBonds: n(bondsMatch[1]),
            value,
            dpName: "",
          });
        }
      }
      k++;
    }
  }

  return bonds;
}

// ── AIF parser ────────────────────────────────────────────────────────────

function parseAIF(text: string): AIF[] {
  const aifs: AIF[] = [];
  const seen = new Set<string>();

  const aifSections = text.split(/Alternate Investment Fund \(A\)/);

  for (const section of aifSections.slice(1)) {
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
    let k = 0;
    while (k < lines.length) {
      const line = lines[k];
      // AIF ISINs start with INF (same as MF) — distinguish by context
      const isinMatch = line.match(/\b(INF[A-Z0-9]{9})\b/);
      if (!isinMatch) { k++; continue; }

      const isin = isinMatch[1];
      if (seen.has(isin)) { k++; continue; }

      // Combine lines
      const combined = lines.slice(k, Math.min(k + 4, lines.length)).join(" ");

      // AIF row: ISIN Description Units NAV Value
      // Numbers at end
      const numMatches = [...combined.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1]));
      const sigNums = numMatches.filter(v => v > 0);

      if (sigNums.length >= 3) {
        const units = sigNums[0];
        const nav = sigNums[1];
        const value = sigNums[sigNums.length - 1];

        if (value > 100) { // sanity check
          const afterIsin = combined.slice(combined.indexOf(isin) + 12).trim();
          const description = afterIsin.replace(/[\d,]+\.\d+.*/s, "").replace(/\s+/g, " ").trim().slice(0, 120);

          seen.add(isin);
          aifs.push({ isin, description, units, nav, value, dpName: "" });
        }
      }
      k++;
    }
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

  const mobileM = text.match(/Mobile:\s*(\d+)/);
  if (mobileM) investor.mobile = mobileM[1];

  const fpDates = firstPurchaseDates(text);
  const mfs: MutualFund[] = [];

  // CAMS+KFintech line format (after pdfjs line extraction):
  // "910161955564/0 INF846K01S29 128NIDGG - Axis NIFTY 100 Index Fund Direct Growth (Non Demat) 700,000.000 39,988.673 29-May-2026 21.9693 KFINTECH"
  // OR split across lines

  // Strategy: find lines with INF ISIN
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;

    const isin = isinM[1];

    // Look back 1-2 lines for folio number
    let folioNo = "";
    for (let k = i; k >= Math.max(0, i - 2); k--) {
      const fm = lines[k].match(/\b(\d{5,}(?:\/\d+)?)\b/);
      if (fm) { folioNo = fm[1]; break; }
    }

    // Scheme name: everything on this line after ISIN (and UCC code)
    const afterIsin = line.slice(line.indexOf(isin) + 12).trim();
    const uccAndScheme = afterIsin.split(/\s+/);
    // First token might be UCC code (alphanumeric like 128NIDGG)
    let schemeStart = 0;
    if (/^[A-Z0-9]{4,12}$/.test(uccAndScheme[0]) && !/^INF/.test(uccAndScheme[0])) schemeStart = 1;
    let schemeParts = uccAndScheme.slice(schemeStart);

    // Also grab scheme name from next line if it continues
    if (i + 1 < lines.length && !/\b(INF[A-Z0-9]{9})\b/.test(lines[i+1]) && !/^\d{5,}/.test(lines[i+1])) {
      schemeParts.push(...lines[i+1].split(/\s+/));
    }

    // Remove trailing "(Non Demat)" and numbers
    const schemeRaw = schemeParts.join(" ").replace(/\(Non.?Demat\)/gi, "").replace(/[\d,]+\.\d+.*/s, "").trim();

    // Find numbers in surrounding lines
    const block = lines.slice(i, Math.min(i + 5, lines.length)).join(" ");
    const numMatches = [...block.matchAll(/([\d,]+\.\d+)/g)].map(m => n(m[1]));

    // NAV date
    const navDateM = block.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
    const navDate = navDateM ? navDateM[1] : "";

    // Registrar
    const registrar = /KFINTECH/.test(block) ? "KFINTECH" : "CAMS";

    // CAMS format numbers: costValue units nav marketValue
    // Filter out large round numbers (cost) vs decimal numbers
    const sigNums = numMatches.filter(v => v > 0);

    if (folioNo && schemeRaw && sigNums.length >= 3) {
      // sigNums: [costValue, units, nav, marketValue] or [units, nav, marketValue]
      let units: number, nav: number, currentValue: number, totalCost: number;

      if (sigNums.length >= 4) {
        totalCost = sigNums[0];
        units = sigNums[1];
        nav = sigNums[2];
        currentValue = sigNums[3];
      } else {
        units = sigNums[0];
        nav = sigNums[1];
        currentValue = sigNums[2];
        totalCost = 0;
      }

      if (units > 0 && currentValue > 0 && !mfs.find(m => m.isin === isin && m.folioNo === folioNo)) {
        mfs.push({
          folioNo, isin,
          schemeName: schemeRaw,
          planType: planType(schemeRaw),
          totalCost, units, nav, navDate,
          currentValue,
          registrar: registrar as any,
          firstPurchaseDate: fpDates[folioNo],
        });
      }
    }
  }

  const totalM = text.match(/Total\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
  investor.totalPortfolioValue = totalM ? n(totalM[2]) : mfs.reduce((s, m) => s + m.currentValue, 0);

  return { investor, mutualFunds: mfs, equities: [], bonds: [], aif: [], portfolioTrend: [] };
}

// ── NSDL main parser ──────────────────────────────────────────────────────

function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const investor: InvestorInfo = { name: "", pan: "", casType: "NSDL" };

  const nsdlM = text.match(/NSDL ID:\s*(\d+)/);
  if (nsdlM) investor.nsdlId = nsdlM[1];

  const nsdlIdx = lines.findIndex(l => l.startsWith("NSDL ID:"));
  if (nsdlIdx !== -1 && lines[nsdlIdx + 1]) investor.name = lines[nsdlIdx + 1];

  const panM = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panM) investor.pan = panM[1];

  const pvM = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]?\s*([\d,]+\.?\d*)/);
  if (pvM) investor.totalPortfolioValue = n(pvM[1]);

  const periodM = text.match(/Statement for the period from ([\d\-A-Za-z]+ to [\d\-A-Za-z]+)/);
  if (periodM) investor.statementPeriod = periodM[1];

  const fpDates = firstPurchaseDates(text);

  return {
    investor,
    mutualFunds: parseMF(text, fpDates),
    equities: parseEquities(text),
    bonds: parseBonds(text),
    aif: parseAIF(text),
    portfolioTrend: parseTrend(text),
  };
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
