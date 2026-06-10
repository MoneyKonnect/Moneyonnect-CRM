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
  frequency?: string;
  maturityDate?: string;
  noOfBonds?: number;
  faceValuePerBond?: number;
  marketPricePerBond?: number;
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

const PMS_BROKERS = [
  "AXIS SECURITIES", "AMBIT CAPITAL", "360 ONE", "ASK INVESTMENT",
  "MOTILAL OSWAL", "KOTAK MAHINDRA BANK", "ICICI SECURITIES",
  "EDELWEISS", "NUVAMA", "MIRAE ASSET", "WHITE OAK",
  "NIPPON INDIA ASSET", "ABAKKUS", "MARCELLUS", "CARNELIAN",
];

function isPMSBroker(dpName: string): boolean {
  return PMS_BROKERS.some(b => dpName.toUpperCase().includes(b));
}

function cleanNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "").replace(/`/g, "").replace(/₹/g, "").trim()) || 0;
}

function detectPlanType(schemeName: string): "DIRECT" | "REGULAR" {
  const upper = schemeName.toUpperCase();
  if (upper.includes("DIRECT") || upper.includes(" DIR ") || upper.includes("-DIR") || upper.includes("DIR-") || upper.includes("D PLAN")) return "DIRECT";
  return "REGULAR";
}

function detectCASType(text: string): "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN" {
  if (text.includes("National Securities Depository Limited") || text.includes("NSDL ID:")) return "NSDL";
  if (text.includes("Central Depository Services") && !text.includes("National Securities Depository")) return "CDSL";
  if (text.includes("Consolidated Account Summary") && (text.includes("KFINTECH") || text.includes("CAMS"))) return "CAMS_KFINTECH";
  return "UNKNOWN";
}

function parseIndianDate(dateStr: string): Date | null {
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

// Extract first purchase dates per folio from transactions section
function extractFirstPurchaseDates(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Find transactions section
  const txIdx = text.search(/MUTUAL FUND FOLIOS.*?Transactions|Mutual Funds Transaction Statement/i);
  if (txIdx === -1) return result;
  const txText = text.slice(txIdx);

  // Split by "Folio No" markers
  const folioBlocks = txText.split(/Folio No\s*[-–]\s*/i);
  for (const block of folioBlocks) {
    const folioMatch = block.match(/^([\d\/]+)/);
    if (!folioMatch) continue;
    const folioNo = folioMatch[1].trim();

    const purchaseDateRegex = /(\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4})\s+(?:Purchase|SIP|Switch.?In|Allotment|New Purchase)/gi;
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
    if (firstDateStr) result[folioNo] = firstDateStr;
  }

  return result;
}

// ─── NSDL MF Parser — line-by-line approach ───────────────────────────────
// pdfjs flattens text so we look for ISIN patterns + folio numbers

function parseNSDLMutualFunds(text: string, firstPurchaseDates: Record<string, string>): MutualFund[] {
  const mfs: MutualFund[] = [];

  // Find the MF Folios section
  const mfStart = text.indexOf("Mutual Fund Folios (F)");
  if (mfStart === -1) return mfs;

  // End at Specialized Investment Fund or Transactions
  let mfEnd = text.indexOf("Transactions for the period", mfStart);
  if (mfEnd === -1) mfEnd = text.indexOf("Transactions  for the period", mfStart);
  if (mfEnd === -1) mfEnd = text.indexOf("Know more about your accounts", mfStart);
  if (mfEnd === -1) mfEnd = mfStart + 50000;

  const mfSection = text.slice(mfStart, mfEnd);

  // Strategy: find every INF ISIN in the MF section
  // Each MF entry has: ISIN UCC SchemeName FolioNo Units AvgCost TotalCost NAV CurrentValue UnrealisedPnL
  // pdfjs puts them space-separated on same line or across lines

  // Split into tokens and find ISIN anchors
  const tokens = mfSection.split(/\s+/).filter(t => t.length > 0);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // ISIN starts with INF and is 12 chars
    if (/^INF[A-Z0-9]{9}$/.test(token)) {
      const isin = token;
      // Next token is UCC (alphanumeric code like MFBRLA0050 or NOT AVAILABLE)
      const ucc = tokens[i + 1] || "";

      // Collect scheme name tokens until we hit a folio number
      // Folio numbers are like: 1040467325, 6584942, 10685705, 70110430694/0
      let schemeNameTokens: string[] = [];
      let j = i + 2;
      let folioNo = "";

      while (j < Math.min(i + 20, tokens.length)) {
        const t = tokens[j];
        // Folio number pattern: digits possibly with /
        if (/^\d{6,}(\/\d+)?$/.test(t)) {
          folioNo = t;
          j++;
          break;
        }
        schemeNameTokens.push(t);
        j++;
      }

      const schemeName = schemeNameTokens.join(" ").trim();

      // After folio: units avgCost totalCost NAV currentValue unrealisedPnL
      // These are all numbers like 9,080.778 or 110.1227
      const nums: number[] = [];
      while (j < Math.min(i + 30, tokens.length) && nums.length < 6) {
        const t = tokens[j].replace(/,/g, "");
        if (/^-?[\d]+\.[\d]+$/.test(t) && !t.includes("INF")) {
          nums.push(parseFloat(t));
        } else if (nums.length > 0 && /^[A-Z]/.test(tokens[j])) {
          // Hit a new word — stop
          break;
        }
        j++;
      }

      if (folioNo && nums.length >= 4) {
        const units = nums[0];
        const avgCost = nums[1];
        const totalCost = nums[2];
        const nav = nums[3];
        const currentValue = nums[4] || 0;
        const unrealisedPnL = nums[5] || 0;

        if (units > 0 && currentValue > 0) {
          mfs.push({
            isin,
            ucc,
            schemeName,
            folioNo,
            planType: detectPlanType(schemeName),
            units,
            avgCostPerUnit: avgCost,
            totalCost,
            nav,
            navDate: "",
            currentValue,
            unrealisedPnL,
            registrar: "CAMS",
            firstPurchaseDate: firstPurchaseDates[folioNo],
          });
        }
      }

      i = j;
    } else {
      i++;
    }
  }

  return mfs;
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

  const portfolioMatch = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]?\s*([\d,]+\.?\d*)/);
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

  const firstPurchaseDates = extractFirstPurchaseDates(text);

  // ── Mutual Funds — new token-based parser ──
  const mutualFunds = parseNSDLMutualFunds(text, firstPurchaseDates);

  // ── Equities ──
  const equities: Equity[] = [];
  const dematSections = text.split(/(?=NSDL Demat Account|CDSL Demat Account)/);

  for (const section of dematSections) {
    if (!section.includes("Demat Account")) continue;

    // Extract broker name — between "Account\n" and "DP ID:"
    const brokerMatch = section.match(/(?:NSDL|CDSL) Demat Account\s+([A-Z0-9][A-Z0-9 \.&\-]+?)\s+DP ID:/);
    const dpName = brokerMatch ? brokerMatch[1].trim() : "UNKNOWN";
    const accountType: "NSDL" | "CDSL" = section.trimStart().startsWith("NSDL") ? "NSDL" : "CDSL";
    const holdingType: "DIRECT" | "PMS" = isPMSBroker(dpName) ? "PMS" : "DIRECT";
    const holderMatch = section.match(/ACCOUNT HOLDERS?\s+([A-Z][A-Z\s]+(?:\(PAN:[A-Z\d]+\))?)/);
    const accountHolder = holderMatch ? holderMatch[1].trim() : "";

    if (accountType === "NSDL") {
      // NSDL equity: INE... SYMBOL.NSE Company FaceVal Qty Price Value
      const eqRegex = /(INE\w{10})\s+(\w+\.(?:NSE|BSE)|ISIN SUSPENDED)\s+([\w\s\(\)\.&\-]+?)\s+([\d\.]+)\s+([\d,]+)\s+([\d,\.]+|See Note)\s+([\d,]+\.\d+)/g;
      const eqSection = section.match(/Equity Shares([\s\S]*?)(?:Sub Total|Mutual Funds \(M\)|Corporate Bonds|Alternate Investment|$)/);
      if (eqSection) {
        let eqMatch;
        while ((eqMatch = eqRegex.exec(eqSection[1])) !== null) {
          const value = cleanNum(eqMatch[7]);
          if (value === 0) continue;
          equities.push({
            isin: eqMatch[1],
            stockSymbol: eqMatch[2].replace(/\.(NSE|BSE)/, ""),
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
      // CDSL format: ISIN SecurityName Qty 0.000 0.000 0.000 Price Value
      const cdslRegex = /(INE\w{10})\s+([\w\s#\.\-\(\)\/&]+?)\s+([\d,]+\.?\d*)\s*[\d\.]+\s*[\d\.]+\s*[\d\.]+\s+([\d,]+\.?\d*)\s+([\d,]+\.\d+)/g;
      const cdslSection = section.match(/Equities \(E\)([\s\S]*?)(?:Sub Total|Mutual Fund Folios|$)/);
      if (cdslSection) {
        let cdslMatch;
        while ((cdslMatch = cdslRegex.exec(cdslSection[1])) !== null) {
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
  const bondRegex = /(INE\w{10})\s+([\w\s\(\)\.&\-]+?)\s+([\w\s\.]+?)\s+(Once|Four|Twice|Quarterly|Half|Monthly|annually?|year)[\w\s]+?(\d{2}-\w{3}-\d{4})\s+(\d[\d,]*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*|Not Available)\s+([\d,]+\.\d+)/gi;
  let bondMatch;
  while ((bondMatch = bondRegex.exec(text)) !== null) {
    const val = cleanNum(bondMatch[9]);
    if (val === 0) continue;
    bonds.push({
      isin: bondMatch[1],
      companyName: bondMatch[2].trim(),
      couponRate: bondMatch[3].trim(),
      frequency: bondMatch[4].trim(),
      maturityDate: bondMatch[5],
      noOfBonds: cleanNum(bondMatch[6]),
      faceValuePerBond: cleanNum(bondMatch[7]),
      marketPricePerBond: bondMatch[8] === "Not Available" ? undefined : cleanNum(bondMatch[8]),
      value: val,
      dpName: "",
    });
  }

  // ── AIF ──
  const aif: AIF[] = [];
  // AIF ISINs start with INF, followed by description, units, NAV, value
  const aifRegex = /(INF\w{9})\s+([\w\s\-\(\)\.]+?-\s*(?:Restricted Transferability|Class\s+\w+|Category\s+[IVX]+)[\w\s\-\(\)\.]*?)\s+([\d,]+\.?\d+)\s+([\d,]+\.?\d+)\s+([\d,]+\.\d+)/g;

  // Find all AIF sections
  const aifStart = text.indexOf("Alternate Investment Fund (A)");
  if (aifStart !== -1) {
    const aifText = text.slice(aifStart, aifStart + 20000);
    let aifMatch;
    while ((aifMatch = aifRegex.exec(aifText)) !== null) {
      const val = cleanNum(aifMatch[5]);
      if (val === 0) continue;
      // Avoid duplicates
      if (!aif.find(a => a.isin === aifMatch![1] && a.value === val)) {
        aif.push({
          isin: aifMatch[1],
          description: aifMatch[2].trim(),
          units: cleanNum(aifMatch[3]),
          nav: cleanNum(aifMatch[4]),
          value: val,
          dpName: "",
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

  const firstPurchaseDates = extractFirstPurchaseDates(text);
  const mutualFunds: MutualFund[] = [];

  // CAMS+KFintech table format (pdfjs flattens):
  // FolioNo ISIN SchemeName CostValue Units NAVDate NAV MarketValue Registrar
  // Use token-based approach similar to NSDL

  const tokens = text.split(/\s+/).filter(t => t.length > 0);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // ISIN starts with INF
    if (/^INF[A-Z0-9]{9}$/.test(token)) {
      const isin = token;

      // Look back for folio number (appears before ISIN in CAMS format)
      let folioNo = "";
      for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
        if (/^\d{5,}(\/\d+)?$/.test(tokens[k])) {
          folioNo = tokens[k];
          break;
        }
      }

      // Collect scheme name tokens after ISIN
      let schemeTokens: string[] = [];
      let j = i + 1;
      // Scheme name ends when we hit numbers (cost value)
      while (j < Math.min(i + 25, tokens.length)) {
        const t = tokens[j];
        if (/^[\d,]+\.\d+$/.test(t)) break; // number = end of scheme name
        schemeTokens.push(t);
        j++;
      }
      const schemeName = schemeTokens.join(" ").trim();

      // Collect numbers: costValue, units, NAV, marketValue
      const nums: number[] = [];
      let navDate = "";
      while (j < Math.min(i + 40, tokens.length) && nums.length < 4) {
        const t = tokens[j];
        // Date like 29-May-2026
        if (/^\d{2}-[A-Za-z]+-\d{4}$/.test(t)) {
          navDate = t;
          j++;
          continue;
        }
        const n = parseFloat(t.replace(/,/g, ""));
        if (!isNaN(n) && n > 0) {
          nums.push(n);
        } else if (t === "CAMS" || t === "KFINTECH") {
          break;
        }
        j++;
      }

      // Find registrar
      let registrar = "CAMS";
      for (let k = j; k < Math.min(j + 5, tokens.length); k++) {
        if (tokens[k] === "CAMS" || tokens[k] === "KFINTECH") {
          registrar = tokens[k];
          break;
        }
      }

      if (folioNo && schemeName && nums.length >= 3) {
        const totalCost = nums[0];
        const units = nums[1];
        const nav = nums[2];
        const currentValue = nums[3] || 0;

        if (units > 0 && currentValue > 0) {
          // avoid duplicates
          if (!mutualFunds.find(m => m.isin === isin && m.folioNo === folioNo)) {
            mutualFunds.push({
              folioNo,
              isin,
              schemeName,
              planType: detectPlanType(schemeName),
              totalCost,
              units,
              navDate,
              nav,
              currentValue,
              registrar: registrar as any,
              firstPurchaseDate: firstPurchaseDates[folioNo],
            });
          }
        }
      }
    }
  }

  // Total portfolio value
  const totalMatch = text.match(/Total\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
  if (totalMatch) investor.totalPortfolioValue = cleanNum(totalMatch[2]);
  else if (mutualFunds.length > 0) {
    investor.totalPortfolioValue = mutualFunds.reduce((s, m) => s + m.currentValue, 0);
  }

  return { investor, mutualFunds, equities: [], bonds: [], aif: [], portfolioTrend: [] };
}

// ─── Main Parse Function ───────────────────────────────────────────────────

export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: uint8Array, password }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") throw new Error("WRONG_PASSWORD");
    throw new Error("PDF_ERROR: " + e?.message);
  }

  // Extract text preserving more structure
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Sort items by vertical position then horizontal
    const items = content.items as any[];
    items.sort((a, b) => {
      const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5]);
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let pageText = "";
    let lastY = -1;
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== -1 && Math.abs(y - lastY) > 3) {
        pageText += "\n";
      } else if (lastY !== -1) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = y;
    }
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
