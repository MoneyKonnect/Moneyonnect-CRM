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
  registrar: string; // CAMS or KFINTECH
  units: number;
  avgCostPerUnit?: number;
  totalCost?: number;
  nav: number;
  navDate: string;
  currentValue: number;
  unrealisedPnL?: number;
  annualisedReturn?: string;
  amcName?: string;
  planType?: string; // Direct / Regular
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
  holdingType: "DIRECT" | "PMS"; // auto-detected
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

// Known PMS brokers — shares held here are tagged as PMS
const PMS_BROKERS = [
  "AXIS SECURITIES", "AMBIT CAPITAL", "360 ONE", "ASK INVESTMENT",
  "MOTILAL OSWAL", "KOTAK MAHINDRA BANK", "ICICI SECURITIES",
  "EDELWEISS", "NUVAMA", "MIRAE ASSET", "WHITE OAK",
  "NIPPON", "ABAKKUS", "MARCELLUS", "CARNELIAN",
];

function isPMSBroker(dpName: string): boolean {
  const upper = dpName.toUpperCase();
  return PMS_BROKERS.some(b => upper.includes(b));
}

function cleanNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "").replace(/`/g, "").trim()) || 0;
}

function detectCASType(text: string): "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN" {
  if (text.includes("National Securities Depository Limited") || text.includes("NSDL ID:")) return "NSDL";
  if (text.includes("Central Depository Services") && !text.includes("National Securities Depository")) return "CDSL";
  if (text.includes("Consolidated Account Summary") && (text.includes("KFINTECH") || text.includes("CAMS"))) return "CAMS_KFINTECH";
  return "UNKNOWN";
}

// ─── NSDL / CDSL Parser ────────────────────────────────────────────────────

function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Investor info
  const investor: InvestorInfo = {
    name: "",
    pan: "",
    casType: "NSDL",
  };

  // Extract NSDL ID
  const nsdlMatch = text.match(/NSDL ID:\s*(\d+)/);
  if (nsdlMatch) investor.nsdlId = nsdlMatch[1];

  // Extract name (line after NSDL ID)
  const nsdlLineIdx = lines.findIndex(l => l.startsWith("NSDL ID:"));
  if (nsdlLineIdx !== -1 && lines[nsdlLineIdx + 1]) {
    investor.name = lines[nsdlLineIdx + 1];
  }

  // Extract PAN
  const panMatch = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panMatch) investor.pan = panMatch[1];

  // Extract total portfolio value
  const portfolioMatch = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]\s*([\d,]+\.?\d*)/);
  if (portfolioMatch) investor.totalPortfolioValue = cleanNum(portfolioMatch[1]);

  // Statement period
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

  // ── Mutual Funds ──
  const mutualFunds: MutualFund[] = [];
  // MF section starts with "Mutual Fund Folios (F)"
  const mfSectionMatch = text.match(/Mutual Fund Folios \(F\)([\s\S]*?)(?=Specialized Investment Fund|Transactions\s+for|$)/);
  if (mfSectionMatch) {
    const mfText = mfSectionMatch[1];
    // Each MF row: ISIN | UCC | Description | FolioNo | Units | AvgCost | TotalCost | NAV | CurrentValue | UnrealisedPnL
    const mfRowRegex = /(INF\w+)\s+(\S+)\s+([\w\s\-\(\)\.]+?)\s+(\d[\d\/]+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([+\-]?[\d,]+\.\d+)/g;
    let mfMatch;
    while ((mfMatch = mfRowRegex.exec(mfText)) !== null) {
      mutualFunds.push({
        isin: mfMatch[1],
        ucc: mfMatch[2],
        schemeName: mfMatch[3].trim(),
        folioNo: mfMatch[4],
        units: cleanNum(mfMatch[5]),
        avgCostPerUnit: cleanNum(mfMatch[6]),
        totalCost: cleanNum(mfMatch[7]),
        nav: cleanNum(mfMatch[8]),
        navDate: "",
        currentValue: cleanNum(mfMatch[9]),
        unrealisedPnL: cleanNum(mfMatch[10]),
        registrar: "CAMS",
      });
    }
  }

  // ── Equities ──
  const equities: Equity[] = [];
  // Find all demat account sections
  const dematSections = text.split(/(?=NSDL Demat Account|CDSL Demat Account)/);

  for (const section of dematSections) {
    if (!section.includes("Demat Account")) continue;

    // Extract broker name
    const brokerMatch = section.match(/(?:NSDL|CDSL) Demat Account\s*\n?\s*([A-Z0-9 \.]+)\s*\n?\s*DP ID:/);
    const dpName = brokerMatch ? brokerMatch[1].trim() : "UNKNOWN";
    const accountType = section.startsWith("NSDL") ? "NSDL" : "CDSL";
    const holdingType = isPMSBroker(dpName) ? "PMS" : "DIRECT";

    // Extract account holders
    const holderMatch = section.match(/ACCOUNT HOLDERS?\s*\n?([\w\s]+(?:\(PAN:[A-Z\d]+\))?)/);
    const accountHolder = holderMatch ? holderMatch[1].trim() : "";

    // NSDL equity rows
    if (accountType === "NSDL") {
      const eqRegex = /(INE\w+)\s+\n?(\w+\.NSE|ISIN SUSPENDED)?\s*\n?([\w\s\(\)\.&]+?)\s+([\d\.]+)\s+([\d,]+)\s+([\d,\.]+|See Note|Not Available)\s+([\d,]+\.\d+)/g;
      let eqMatch;
      const eqSection = section.match(/Equity Shares([\s\S]*?)(?=Sub Total|Mutual Funds|Corporate Bonds|Alternate|$)/);
      if (eqSection) {
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

    // CDSL equity rows (different format — has multiple balance columns)
    if (accountType === "CDSL") {
      const cdslEqRegex = /(INE\w+)\s+([\w\s#\.\-\(\)\/]+?)\s+([\d\.]+)\s*\n?\s*[\d\.]+\s*\n?\s*[\d\.]+\s+([\d,]+\.?\d*)\s+([\d,]+\.\d+)/g;
      let cdslMatch;
      const cdslSection = section.match(/Equities \(E\)([\s\S]*?)(?=Sub Total|Mutual Fund Folios|$)/);
      if (cdslSection) {
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
    // Find dp name from context
    const dpMatch = section.match(/(?:NSDL|CDSL) Demat Account\s*\n?\s*([A-Z0-9 \.]+)\s*DP ID:/);
    const dpName = dpMatch ? dpMatch[1].trim() : "";
    const aifRowRegex = /(INF\w+)\s+([\w\s\-\(\)\.]+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.\d+)/g;
    let aifMatch;
    const aifContent = section.match(/Alternate Investment Fund \(A\)([\s\S]*?)(?=Sub Total|Corporate Bonds|$)/);
    if (aifContent) {
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

  const investor: InvestorInfo = {
    name: "",
    pan: "",
    casType: "CAMS_KFINTECH",
  };

  // Extract name and email
  const emailMatch = text.match(/Email Id:\s*(\S+)/i);
  if (emailMatch) investor.email = emailMatch[1];

  // Name is usually after "Email Id:" line
  const emailLineIdx = lines.findIndex(l => l.toLowerCase().startsWith("email id:"));
  if (emailLineIdx !== -1 && lines[emailLineIdx + 1]) {
    investor.name = lines[emailLineIdx + 1];
  }

  // Statement date
  const dateMatch = text.match(/As on (\d{2}-\w+-\d{4})/);
  if (dateMatch) investor.statementDate = dateMatch[1];

  // Mobile
  const mobileMatch = text.match(/Mobile:\s*(\d+)/);
  if (mobileMatch) investor.mobile = mobileMatch[1];

  const mutualFunds: MutualFund[] = [];

  // Parse each folio row
  // Format: FolioNo ISIN SchemeName CostValue Units NAVDate NAV MarketValue Registrar
  const folioRegex = /([\d\/]+(?:\/\d+)?)\s+(INF\w+)\s+([\w\d\s\-\(\)\.\&\/]+?)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(\d{2}-\w+-\d{4})\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(CAMS|KFINTECH)/g;

  let match;
  while ((match = folioRegex.exec(text)) !== null) {
    mutualFunds.push({
      folioNo: match[1],
      isin: match[2],
      schemeName: match[3].trim(),
      totalCost: cleanNum(match[4]),
      units: cleanNum(match[5]),
      navDate: match[6],
      nav: cleanNum(match[7]),
      currentValue: cleanNum(match[8]),
      registrar: match[9] as "CAMS" | "KFINTECH",
    });
  }

  // Fallback: line-by-line parsing for CAMS+KFintech
  if (mutualFunds.length === 0) {
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Folio lines typically start with digits followed by /
      if (/^\d{5,}/.test(line) && lines[i + 1] && lines[i + 1].startsWith("INF")) {
        const folioNo = line.split(" ")[0];
        const isin = lines[i + 1];
        const schemeName = lines[i + 2] || "";
        // Find NAV and value in next few lines
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
          if (/\d{2}-\w+-\d{4}/.test(lines[j])) navDate = lines[j].match(/(\d{2}-\w+-\d{4})/)![1];
        }
        if (units > 0 && value > 0) {
          mutualFunds.push({ folioNo, isin, schemeName, units, nav, navDate, currentValue: value, totalCost: cost, registrar: registrar as any });
        }
        i += 8;
      } else {
        i++;
      }
    }
  }

  // Total
  const totalMatch = text.match(/Total\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
  if (totalMatch) investor.totalPortfolioValue = cleanNum(totalMatch[2]);

  return {
    investor,
    mutualFunds,
    equities: [],
    bonds: [],
    aif: [],
    portfolioTrend: [],
  };
}

// ─── Main Parse Function ───────────────────────────────────────────────────

export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  // Dynamically import pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: uint8Array, password }).promise;
  } catch (e: any) {
    if (e?.name === "PasswordException") {
      throw new Error("WRONG_PASSWORD");
    }
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
    // Try NSDL parser as fallback
    result = parseNSDL(fullText);
    result.investor.casType = "UNKNOWN";
  }

  result.rawText = fullText;
  return result;
}
