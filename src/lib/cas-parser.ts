// CAS PDF Parser — supports NSDL CAS, CDSL CAS, CAMS+KFintech
// All parsing happens client-side in the browser

export interface InvestorInfo {
  name: string;
  pan: string;
  email?: string;
  mobile?: string;
  address?: string;
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
  annualisedReturn?: string;
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
  dpId?: string;
  clientId?: string;
  accountType: "NSDL" | "CDSL";
  holdingType: "DIRECT" | "PMS";
  accountHolder?: string;
}

export interface Bond {
  isin: string;
  companyName: string;
  couponRate?: string;
  frequency?: string;
  maturityDate?: string;
  noOfBonds?: number;
  faceValuePerBond?: number;
  marketPricePerBond?: number;
  value: number;
  dpName: string;
  accountHolder?: string;
}

export interface AIF {
  isin: string;
  description: string;
  units: number;
  nav: number;
  value: number;
  dpName: string;
  accountHolder?: string;
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

// Known PMS brokers
const PMS_BROKERS = [
  "AXIS SECURITIES", "AMBIT CAPITAL", "360 ONE", "ASK INVESTMENT",
  "MOTILAL OSWAL", "KOTAK MAHINDRA BANK", "ICICI SECURITIES",
  "EDELWEISS", "NUVAMA", "MIRAE ASSET", "WHITE OAK",
  "NIPPON", "ABAKKUS", "MARCELLUS", "CARNELIAN",
];

function isPMSBroker(dpName: string): boolean {
  return PMS_BROKERS.some(b => dpName.toUpperCase().includes(b));
}

function cleanNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "").replace(/`/g, "").replace(/₹/g, "").trim()) || 0;
}

// Detect Direct vs Regular from scheme name
function detectPlanType(schemeName: string): "DIRECT" | "REGULAR" {
  const upper = schemeName.toUpperCase();
  if (upper.includes("DIRECT") || upper.includes("DIR ") || upper.includes("-D ") || upper.includes("DIR-")) return "DIRECT";
  return "REGULAR";
}

function detectCASType(text: string): "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN" {
  if (text.includes("National Securities Depository Limited") || text.includes("NSDL ID:")) return "NSDL";
  if (text.includes("Central Depository Services") && !text.includes("National Securities Depository")) return "CDSL";
  if (text.includes("Consolidated Account Summary") && (text.includes("KFINTECH") || text.includes("CAMS"))) return "CAMS_KFINTECH";
  return "UNKNOWN";
}

// Extract first purchase dates per folio from transactions section
// Returns map of folioNo -> first purchase date
function extractFirstPurchaseDates(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Find the Transactions section
  const txSectionMatch = text.match(/(?:MUTUAL FUND FOLIOS \(F\)|Mutual Funds Transaction Statement)([\s\S]*?)(?:Know more about|End of Statement|\*\*\*End)/i);
  if (!txSectionMatch) return result;

  const txText = txSectionMatch[1];

  // Find folio blocks: "Folio No - XXXXXXX" followed by date + Purchase lines
  // Pattern: Folio No - 6584942 ... 17-MAY-2026 Purchase ...
  const folioBlocks = txText.split(/Folio No\s*[-–]\s*/);

  for (const block of folioBlocks) {
    if (!block.trim()) continue;

    // Extract folio number (first token)
    const folioMatch = block.match(/^([\d\/]+)/);
    if (!folioMatch) continue;
    const folioNo = folioMatch[1].trim();

    // Find all purchase dates in this block
    // Format: dd-MMM-yyyy Purchase
    const purchaseDateRegex = /(\d{2}-[A-Z]{3}-\d{4})\s+(?:Purchase|SIP|Switch In|Allotment)/gi;
    let match;
    let firstDate: Date | null = null;
    let firstDateStr = "";

    while ((match = purchaseDateRegex.exec(block)) !== null) {
      const dateStr = match[1];
      const parsed = parseIndianDate(dateStr);
      if (parsed && (!firstDate || parsed < firstDate)) {
        firstDate = parsed;
        firstDateStr = dateStr;
      }
    }

    if (firstDateStr && folioNo) {
      result[folioNo] = firstDateStr;
    }
  }

  // Also try CAMS/KFintech format: "Opening Balance" with date context
  // Pattern: ISIN: INFxxx ... Opening Balance ... dd-MMM-yyyy Purchase
  const isinBlocks = txText.split(/ISIN:\s*/);
  for (const block of isinBlocks) {
    // Extract folio from "Folio No - XXXXX" within this block
    const folioMatch = block.match(/Folio No\s*[-–]\s*([\d\/]+)/);
    if (!folioMatch) continue;
    const folioNo = folioMatch[1].trim();

    const purchaseDateRegex = /(\d{2}-[A-Z]{3}-\d{4})\s+Purchase/gi;
    let match;
    let firstDate: Date | null = null;
    let firstDateStr = "";

    while ((match = purchaseDateRegex.exec(block)) !== null) {
      const parsed = parseIndianDate(match[1]);
      if (parsed && (!firstDate || parsed < firstDate)) {
        firstDate = parsed;
        firstDateStr = match[1];
      }
    }

    if (firstDateStr && folioNo && !result[folioNo]) {
      result[folioNo] = firstDateStr;
    }
  }

  return result;
}

function parseIndianDate(dateStr: string): Date | null {
  // dd-MMM-yyyy e.g. 17-MAY-2026
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const parts = dateStr.toUpperCase().split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

// ─── NSDL / CDSL Parser ────────────────────────────────────────────────────

function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const investor: InvestorInfo = { name: "", pan: "", casType: "NSDL" };

  const nsdlMatch = text.match(/NSDL ID:\s*(\d+)/);
  if (nsdlMatch) investor.nsdlId = nsdlMatch[1];

  const nsdlLineIdx = lines.findIndex(l => l.startsWith("NSDL ID:"));
  if (nsdlLineIdx !== -1 && lines[nsdlLineIdx + 1]) investor.name = lines[nsdlLineIdx + 1];

  const panMatch = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panMatch) investor.pan = panMatch[1];

  const portfolioMatch = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]\s*([\d,]+\.?\d*)/);
  if (portfolioMatch) investor.totalPortfolioValue = cleanNum(portfolioMatch[1]);

  const periodMatch = text.match(/Statement for the period from ([\d\-A-Za-z]+ to [\d\-A-Za-z]+)/);
  if (periodMatch) investor.statementPeriod = periodMatch[1];

  // Portfolio trend
  const portfolioTrend: PortfolioTrend[] = [];
  const trendRegex = /((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})\s+([\d,]+\.\d+)\s+([+\-][\d,]+\.\d+)?\s+([+\-]\d+\.\d+)?/g;
  let trendMatch;
  while ((trendMatch = trendRegex.exec(text)) !== null) {
    portfolioTrend.push({
      month: trendMatch[1],
      value: cleanNum(trendMatch[2]),
      change: trendMatch[3] ? cleanNum(trendMatch[3]) : undefined,
      changePct: trendMatch[4] ? parseFloat(trendMatch[4]) : undefined,
    });
  }

  // Extract first purchase dates
  const firstPurchaseDates = extractFirstPurchaseDates(text);

  // ── Mutual Funds ──
  const mutualFunds: MutualFund[] = [];
  const mfSectionMatch = text.match(/Mutual Fund Folios \(F\)([\s\S]*?)(?=Specialized Investment Fund|Transactions\s+for|$)/);
  if (mfSectionMatch) {
    const mfText = mfSectionMatch[1];
    const mfRowRegex = /(INF\w+)\s+(\S+)\s+([\w\s\-\(\)\.]+?)\s+(\d[\d\/]+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([+\-]?[\d,]+\.\d+)/g;
    let mfMatch;
    while ((mfMatch = mfRowRegex.exec(mfText)) !== null) {
      const schemeName = mfMatch[3].trim();
      const folioNo = mfMatch[4];
      mutualFunds.push({
        isin: mfMatch[1],
        ucc: mfMatch[2],
        schemeName,
        folioNo,
        planType: detectPlanType(schemeName),
        units: cleanNum(mfMatch[5]),
        avgCostPerUnit: cleanNum(mfMatch[6]),
        totalCost: cleanNum(mfMatch[7]),
        nav: cleanNum(mfMatch[8]),
        navDate: "",
        currentValue: cleanNum(mfMatch[9]),
        unrealisedPnL: cleanNum(mfMatch[10]),
        registrar: "CAMS",
        firstPurchaseDate: firstPurchaseDates[folioNo],
      });
    }
  }

  // ── Equities ──
  const equities: Equity[] = [];
  const dematSections = text.split(/(?=NSDL Demat Account|CDSL Demat Account)/);

  for (const section of dematSections) {
    if (!section.includes("Demat Account")) continue;
    const brokerMatch = section.match(/(?:NSDL|CDSL) Demat Account\s*\n?\s*([A-Z0-9 \.]+)\s*\n?\s*DP ID:/);
    const dpName = brokerMatch ? brokerMatch[1].trim() : "UNKNOWN";
    const accountType = section.startsWith("NSDL") ? "NSDL" : "CDSL";
    const holdingType = isPMSBroker(dpName) ? "PMS" : "DIRECT";
    const holderMatch = section.match(/ACCOUNT HOLDERS?\s*\n?([\w\s]+(?:\(PAN:[A-Z\d]+\))?)/);
    const accountHolder = holderMatch ? holderMatch[1].trim() : "";

    if (accountType === "NSDL") {
      const eqRegex = /(INE\w+)\s+\n?(\w+\.NSE|ISIN SUSPENDED)?\s*\n?([\w\s\(\)\.&]+?)\s+([\d\.]+)\s+([\d,]+)\s+([\d,\.]+|See Note|Not Available)\s+([\d,]+\.\d+)/g;
      const eqSection = section.match(/Equity Shares([\s\S]*?)(?=Sub Total|Mutual Funds|Corporate Bonds|Alternate|$)/);
      if (eqSection) {
        let eqMatch;
        while ((eqMatch = eqRegex.exec(eqSection[1])) !== null) {
          const value = cleanNum(eqMatch[7]);
          if (value === 0) continue;
          equities.push({
            isin: eqMatch[1],
            stockSymbol: eqMatch[2]?.replace(".NSE", ""),
            companyName: eqMatch[3].trim(),
            faceValue: cleanNum(eqMatch[4]),
            quantity: cleanNum(eqMatch[5]),
            marketPrice: eqMatch[6] === "See Note" ? undefined : cleanNum(eqMatch[6]),
            value,
            dpName,
            accountType,
            holdingType,
            accountHolder,
          });
        }
      }
    }

    if (accountType === "CDSL") {
      const cdslEqRegex = /(INE\w+)\s+([\w\s#\.\-\(\)\/]+?)\s+([\d\.]+)\s*\n?\s*[\d\.]+\s*\n?\s*[\d\.]+\s+([\d,]+\.?\d*)\s+([\d,]+\.\d+)/g;
      const cdslSection = section.match(/Equities \(E\)([\s\S]*?)(?=Sub Total|Mutual Fund Folios|$)/);
      if (cdslSection) {
        let cdslMatch;
        while ((cdslMatch = cdslEqRegex.exec(cdslSection[1])) !== null) {
          const value = cleanNum(cdslMatch[5]);
          if (value === 0) continue;
          equities.push({
            isin: cdslMatch[1],
            companyName: cdslMatch[2].trim(),
            quantity: cleanNum(cdslMatch[3]),
            marketPrice: cleanNum(cdslMatch[4]),
            value,
            dpName,
            accountType: "CDSL",
            holdingType,
            accountHolder,
          });
        }
      }
    }
  }

  // ── Bonds ──
  const bonds: Bond[] = [];
  const bondRegex = /(INE\w+)\s+([\w\s\(\)\.&]+?)\s+([\w\s]+)\s+([\w\s]+)\s+(\d{2}-\w{3}-\d{4})\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*|Not Available)\s+([\d,]+\.\d+)/g;
  let bondMatch;
  while ((bondMatch = bondRegex.exec(text)) !== null) {
    bonds.push({
      isin: bondMatch[1],
      companyName: bondMatch[2].trim(),
      couponRate: bondMatch[3].trim(),
      frequency: bondMatch[4].trim(),
      maturityDate: bondMatch[5],
      noOfBonds: cleanNum(bondMatch[6]),
      faceValuePerBond: cleanNum(bondMatch[7]),
      marketPricePerBond: bondMatch[8] === "Not Available" ? undefined : cleanNum(bondMatch[8]),
      value: cleanNum(bondMatch[9]),
      dpName: "",
    });
  }

  // ── AIF ──
  const aif: AIF[] = [];
  const aifSections = text.split(/(?=Alternate Investment Fund \(A\))/);
  for (const section of aifSections.slice(1)) {
    const dpMatch = section.match(/(?:NSDL|CDSL) Demat Account\s*\n?\s*([A-Z0-9 \.]+)\s*DP ID:/);
    const dpName = dpMatch ? dpMatch[1].trim() : "";
    const aifRowRegex = /(INF\w+)\s+([\w\s\-\(\)\.]+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.\d+)/g;
    const aifContent = section.match(/Alternate Investment Fund \(A\)([\s\S]*?)(?=Sub Total|Corporate Bonds|$)/);
    if (aifContent) {
      let aifMatch;
      while ((aifMatch = aifRowRegex.exec(aifContent[1])) !== null) {
        const value = cleanNum(aifMatch[5]);
        if (value === 0) continue;
        aif.push({
          isin: aifMatch[1],
          description: aifMatch[2].trim(),
          units: cleanNum(aifMatch[3]),
          nav: cleanNum(aifMatch[4]),
          value,
          dpName,
        });
      }
    }
  }

  return { investor, mutualFunds, equities, bonds, aif, portfolioTrend };
}

// ─── CAMS + KFintech Parser ────────────────────────────────────────────────

function parseCAMSKFintech(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const investor: InvestorInfo = { name: "", pan: "", casType: "CAMS_KFINTECH" };

  const emailMatch = text.match(/Email Id:\s*(\S+)/i);
  if (emailMatch) investor.email = emailMatch[1];

  const emailLineIdx = lines.findIndex(l => l.toLowerCase().startsWith("email id:"));
  if (emailLineIdx !== -1 && lines[emailLineIdx + 1]) investor.name = lines[emailLineIdx + 1];

  const dateMatch = text.match(/As on (\d{2}-\w+-\d{4})/);
  if (dateMatch) investor.statementDate = dateMatch[1];

  const mobileMatch = text.match(/Mobile:\s*(\d+)/);
  if (mobileMatch) investor.mobile = mobileMatch[1];

  // Extract first purchase dates
  const firstPurchaseDates = extractFirstPurchaseDates(text);

  const mutualFunds: MutualFund[] = [];

  // Primary regex for table rows
  const folioRegex = /([\d\/]+(?:\/\d+)?)\s+(INF\w+)\s+([\w\d\s\-\(\)\.\&\/]+?)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(\d{2}-\w+-\d{4})\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(CAMS|KFINTECH)/g;
  let match;
  while ((match = folioRegex.exec(text)) !== null) {
    const schemeName = match[3].trim();
    const folioNo = match[1];
    mutualFunds.push({
      folioNo,
      isin: match[2],
      schemeName,
      planType: detectPlanType(schemeName),
      totalCost: cleanNum(match[4]),
      units: cleanNum(match[5]),
      navDate: match[6],
      nav: cleanNum(match[7]),
      currentValue: cleanNum(match[8]),
      registrar: match[9] as "CAMS" | "KFINTECH",
      firstPurchaseDate: firstPurchaseDates[folioNo],
    });
  }

  // Fallback line-by-line
  if (mutualFunds.length === 0) {
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\d{5,}/.test(line) && lines[i + 1] && lines[i + 1].startsWith("INF")) {
        const folioNo = line.split(" ")[0];
        const isin = lines[i + 1];
        const schemeName = lines[i + 2] || "";
        let nav = 0, units = 0, value = 0, cost = 0, navDate = "", registrar = "CAMS";
        for (let j = i + 3; j < Math.min(i + 10, lines.length); j++) {
          const numMatch = lines[j].match(/^([\d,]+\.\d+)$/);
          if (numMatch) {
            const n = cleanNum(numMatch[1]);
            if (units === 0) units = n;
            else if (nav === 0) nav = n;
            else if (value === 0) value = n;
          }
          if (/CAMS|KFINTECH/.test(lines[j])) registrar = lines[j].includes("KFINTECH") ? "KFINTECH" : "CAMS";
          if (/\d{2}-\w+-\d{4}/.test(lines[j])) {
            const dm = lines[j].match(/(\d{2}-\w+-\d{4})/);
            if (dm) navDate = dm[1];
          }
        }
        if (units > 0 && value > 0) {
          mutualFunds.push({
            folioNo, isin, schemeName,
            planType: detectPlanType(schemeName),
            units, nav, navDate,
            currentValue: value, totalCost: cost,
            registrar: registrar as any,
            firstPurchaseDate: firstPurchaseDates[folioNo],
          });
        }
        i += 8;
      } else { i++; }
    }
  }

  const totalMatch = text.match(/Total\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
  if (totalMatch) investor.totalPortfolioValue = cleanNum(totalMatch[2]);

  return { investor, mutualFunds, equities: [], bonds: [], aif: [], portfolioTrend: [] };
}

// ─── Main Parse Function ───────────────────────────────────────────────────

export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: uint8Array, password }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") throw new Error("WRONG_PASSWORD");
    throw new Error("PDF_ERROR: " + e?.message);
  }

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  const casType = detectCASType(fullText);
  let result: ParsedCAS;

  if (casType === "NSDL" || casType === "CDSL") {
    result = parseNSDL(fullText);
    result.investor.casType = casType;
  } else if (casType === "CAMS_KFINTECH") {
    result = parseCAMSKFintech(fullText);
  } else {
    result = parseNSDL(fullText);
    result.investor.casType = "UNKNOWN";
  }

  result.rawText = fullText;
  return result;
}
