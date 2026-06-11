export interface InvestorInfo {
  name: string; pan: string; email?: string; mobile?: string;
  nsdlId?: string; statementDate?: string; statementPeriod?: string;
  totalPortfolioValue?: number;
  casType: "NSDL" | "CDSL" | "CAMS_KFINTECH" | "UNKNOWN";
}
export interface MutualFund {
  folioNo: string; schemeName: string; isin: string; ucc?: string;
  registrar: string; planType: "DIRECT" | "REGULAR";
  units: number; avgCostPerUnit?: number; totalCost?: number;
  nav: number; navDate: string; currentValue: number;
  unrealisedPnL?: number; firstPurchaseDate?: string;
}
export interface Equity {
  isin: string; stockSymbol?: string; companyName: string;
  faceValue?: number; quantity: number; marketPrice?: number;
  value: number; dpName: string;
  accountType: "NSDL" | "CDSL"; holdingType: "DIRECT" | "PMS";
}
export interface Bond {
  isin: string; companyName: string; couponRate?: string;
  maturityDate?: string; noOfBonds?: number; faceValuePerBond?: number;
  value: number; dpName: string;
}
export interface AIF {
  isin: string; description: string; units: number;
  nav: number; value: number; dpName: string;
}
export interface PortfolioTrend {
  month: string; value: number; change?: number; changePct?: number;
}
export interface ParsedCAS {
  investor: InvestorInfo; mutualFunds: MutualFund[];
  equities: Equity[]; bonds: Bond[]; aif: AIF[];
  portfolioTrend: PortfolioTrend[]; rawText?: string;
}

const PMS_BROKERS = ["AXIS SECURITIES","AMBIT CAPITAL","360 ONE","ASK INVESTMENT",
  "MOTILAL OSWAL","KOTAK MAHINDRA BANK","EDELWEISS","NUVAMA","WHITE OAK",
  "ABAKKUS","MARCELLUS","CARNELIAN"];

function isPMS(dp: string) { return PMS_BROKERS.some(b => dp.toUpperCase().includes(b)); }
function num(s: string) { return parseFloat((s||"").replace(/,/g,"").replace(/[`₹]/g,"").trim())||0; }
function isDirect(name: string) { return /direct/i.test(name); }

// ── text extraction: group pdfjs items by Y row ──────────────────────────
async function extractText(pdf: any): Promise<string> {
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent() as any;
    const rows = new Map<number,{x:number,s:string}[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y,[]);
      rows.get(y)!.push({x:it.transform[4], s:it.str});
    }
    for (const y of [...rows.keys()].sort((a,b)=>b-a)) {
      const line = rows.get(y)!.sort((a,b)=>a.x-b.x).map(r=>r.s).join(" ").trim();
      if (line) out += line + "\n";
    }
  }
  return out;
}

// ── first purchase dates from transactions section ────────────────────────
function getFirstPurchaseDates(text: string): Record<string,string> {
  const out: Record<string,string> = {};
  const idx = text.search(/MUTUAL FUND FOLIOS.*?Transactions|Mutual Funds Transaction Statement/i);
  if (idx === -1) return out;
  for (const block of text.slice(idx).split(/Folio No\s*[-–]\s*/i)) {
    const fm = block.match(/^([\d\/]+)/);
    if (!fm) continue;
    const folio = fm[1];
    const re = /(\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4})\s+(?:Purchase|SIP|Switch.?In|Allotment|New Purchase)/gi;
    let m, best: Date|null=null, bestStr="";
    while((m=re.exec(block))!==null){
      const parts = m[1].toUpperCase().split("-");
      const months: Record<string,number>={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
      const d = new Date(+parts[2], months[parts[1]], +parts[0]);
      if (!best||d<best){best=d;bestStr=m[1];}
    }
    if (bestStr) out[folio]=bestStr;
  }
  return out;
}

// ── MF parser ─────────────────────────────────────────────────────────────
// Raw text format (from vimi.pdf):
// "INF209K01VF2   Aditya Birla Sun Life   1040467325   9,080.778   110.1227   10,00,000.00   165.5700   15,03,504.41   5,03,504.41"
// "MFBRLA0050   Digital India Fund -"
// "Growth-Direct Plan"
// ISIN + partial_name + folio + units + avgcost + totalcost + nav + value + pnl (all on ONE line)
// UCC + rest_of_scheme_name (next line)
// more_scheme_name (line after that)

function parseMF(text: string, fpDates: Record<string,string>): MutualFund[] {
  const mfs: MutualFund[] = [];
  const mfStart = text.indexOf("Mutual Fund Folios (F)");
  if (mfStart===-1) return mfs;
  let mfEnd = text.indexOf("\nTransactions", mfStart);
  if (mfEnd===-1) mfEnd = text.indexOf("Know more about your accounts", mfStart);
  if (mfEnd===-1) mfEnd = mfStart+80000;
  const section = text.slice(mfStart, mfEnd);
  const lines = section.split("\n").map(l=>l.trim()).filter(Boolean);

  // Get registrar map from "Know more" section (folio -> CAMS/KFINTECH)
  const registrarMap: Record<string,string> = {};
  const kmIdx = text.indexOf("Folio No.");
  if (kmIdx !== -1) {
    const kmSection = text.slice(kmIdx);
    const rtaRe = /(\d{6,}(?:\/\d+)?)\s[\s\S]{1,300}?(CAMS|KFIN)/g;
    let rm;
    while((rm=rtaRe.exec(kmSection))!==null){
      const folio = rm[1];
      const rta = rm[2].toUpperCase()==="KFIN" ? "KFINTECH" : "CAMS";
      if (!registrarMap[folio]) registrarMap[folio] = rta;
    }
  }

  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;
    const isin = isinM[1];

    // All decimal numbers on this line
    const decNums = [...line.matchAll(/([\d,]+\.\d+)/g)].map(m=>num(m[1]));
    // Folio: long integer on this line
    const folioM = line.match(/\b(\d{6,}(?:\/\d+)?)\b/);
    const folioNo = folioM ? folioM[1] : "";

    if (!folioNo || decNums.length < 4) continue;

    // Numbers order: units, avgCost, totalCost, nav, currentValue, pnl
    const [units, avgCost, totalCost, nav, currentValue, pnl] = decNums;
    if (!units || !currentValue) continue;

    // Scheme name: between ISIN and folio on line 1 + line 2 + line 3
    const isinEnd = line.indexOf(isin) + 12;
    const beforeFolio = line.slice(isinEnd, line.indexOf(folioNo)).trim();

    // Next line: "UCC   rest of scheme name"
    const line2 = lines[i+1] || "";
    const line3 = lines[i+2] || "";

    // UCC is first token of line2 (no spaces in UCC like MFBRLA0050 or "NOT AVAILABLE")
    const line2Parts = line2.split(/\s{2,}/);
    const ucc = line2Parts[0] || "";
    const schemeFromLine2 = line2Parts.slice(1).join(" ");
    // line3 is continuation of scheme name (no ISIN, no folio)
    const schemeFromLine3 = (!line3.match(/\bINF[A-Z0-9]{9}\b/) && !line3.match(/^\d{6,}/))
      ? line3.replace(/[\d,]+\.\d+/g,"").trim() : "";

    const schemeName = [beforeFolio, schemeFromLine2, schemeFromLine3]
      .join(" ").replace(/\s+/g," ").replace(/^[-\s]+/,"").trim();

    if (!mfs.find(m=>m.isin===isin && m.folioNo===folioNo)) {
      mfs.push({
        isin, ucc, schemeName, folioNo,
        planType: isDirect(schemeName) ? "DIRECT" : "REGULAR",
        units, avgCostPerUnit: avgCost, totalCost, nav,
        navDate: "", currentValue,
        unrealisedPnL: pnl||undefined,
        registrar: registrarMap[folioNo]||"CAMS",
        firstPurchaseDate: fpDates[folioNo],
      });
    }
  }
  return mfs;
}

// ── NSDL equity parser ────────────────────────────────────────────────────
// Raw text format (from vimi.pdf):
// " INE216A01030 BRITANNIA INDUSTRIES LTD   1.00   120   5,204.50   6,24,540.00"
// "BRITANNIA.NSE"
// Single line: ISIN  CompanyName  FaceVal  Qty  Price  Value
// Price can be "See Note" for suspended

function parseNSDLEquities(section: string, dpName: string): Equity[] {
  const out: Equity[] = [];
  const holdingType: "DIRECT"|"PMS" = isPMS(dpName) ? "PMS" : "DIRECT";

  const eqStart = section.indexOf("Equity Shares");
  if (eqStart===-1) return out;
  let eqEnd = section.indexOf("Sub Total", eqStart);
  if (eqEnd===-1) eqEnd = eqStart+30000;
  const eqText = section.slice(eqStart, eqEnd);

  // Match each equity line directly with regex
  // Pattern: INE(10chars) COMPANY_NAME FACEVALUE QUANTITY PRICE VALUE
  // Where PRICE can be "See Note"
  const lines = eqText.split("\n");

  for (let k=0; k<lines.length; k++) {
    const line = lines[k].trim();

    // Must have an INE ISIN
    if (!/\b(INE[A-Z0-9]{10}|IN8[A-Z0-9]{9})\b/.test(line)) continue;
    const isin = line.match(/\b(INE[A-Z0-9]{10}|IN8[A-Z0-9]{9})\b/)![1];

    // Skip header lines
    if (line.includes("Face Value") || line.includes("ISIN Company")) continue;

    // Get stock symbol from next line
    const nextLine = (lines[k+1]||"").trim();
    const symM = nextLine.match(/^(\w+)\.(NSE|BSE)$/);
    const stockSymbol = symM ? symM[1] : undefined;

    const afterIsin = line.slice(line.indexOf(isin)+12).trim();

    // Check for See Note (suspended ISIN)
    const hasSeeNote = afterIsin.includes("See Note");

    if (hasSeeNote) {
      // Format: CompanyName  FaceVal  Qty  See Note  Value
      // Extract: everything before first number = company name
      // Numbers: faceVal, qty, value
      const cleaned = afterIsin.replace(/See Note/g,"");
      const company = cleaned.replace(/[\d,\.]+.*/s,"").replace(/ISIN SUSPENDED/,"").trim();
      const ns = [...cleaned.matchAll(/([\d,]+\.?\d*)/g)].map(m=>num(m[1])).filter(v=>v>0);
      if (ns.length>=2) {
        out.push({
          isin, stockSymbol,
          companyName: company.replace(/\s+/g," ").trim(),
          faceValue: ns[0], quantity: ns[1], marketPrice: undefined,
          value: ns[ns.length-1],
          dpName, accountType:"NSDL", holdingType,
        });
      }
    } else {
      // Format: CompanyName  FaceVal  Qty  Price  Value
      // Last 4 numbers are: faceVal, qty, price, value
      const company = afterIsin.replace(/[\d,\.]+.*/s,"").trim();
      const ns = [...afterIsin.matchAll(/([\d,]+\.?\d*)/g)].map(m=>num(m[1])).filter(v=>v>=0);
      // Need at least faceVal + qty + price + value = 4 nums
      if (ns.length>=4) {
        const faceValue = ns[0];
        const quantity = ns[1];
        const marketPrice = ns[2];
        const value = ns[3];
        if (value>0) {
          out.push({
            isin, stockSymbol,
            companyName: company.replace(/\s+/g," ").trim(),
            faceValue, quantity, marketPrice, value,
            dpName, accountType:"NSDL", holdingType,
          });
        }
      }
    }
  }
  return out;
}

// ── CDSL equity parser ────────────────────────────────────────────────────
// Raw text format (from vimi.pdf):
// "INE117A01022   ABB INDIA LIMITED - NEW   50.000   0.000   0.000   7,229.60   3,61,480.00"
// "EQUITY SHARES OF RS. 2/-   50.000   0.000   0.000"
// "AFTER SPLIT   0.000   0.000   0.000"
// qty = first number on first line (Current Balance)
// price = second-to-last number on first line
// value = last number on first line

function parseCDSLEquities(section: string, dpName: string): Equity[] {
  const out: Equity[] = [];
  const holdingType: "DIRECT"|"PMS" = isPMS(dpName) ? "PMS" : "DIRECT";

  const eqStart = section.indexOf("Equities (E)");
  if (eqStart===-1) return out;
  let eqEnd = section.indexOf("Sub Total", eqStart);
  if (eqEnd===-1) eqEnd = eqStart+30000;
  const eqText = section.slice(eqStart, eqEnd);
  const lines = eqText.split("\n").map(l=>l.trim()).filter(Boolean);

  for (let k=0; k<lines.length; k++) {
    const line = lines[k];
    if (!/\b(INE[A-Z0-9]{10})\b/.test(line)) continue;
    const isin = line.match(/\b(INE[A-Z0-9]{10})\b/)![1];

    const afterIsin = line.slice(line.indexOf(isin)+12).trim();

    // All numbers on this first line
    const ns = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m=>num(m[1]));

    // Company name = text before first number
    const companyFirst = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();

    // Collect remaining company name from continuation lines
    // (lines that don't start with ISIN and are not all numbers)
    let companyExtra = "";
    for (let j=k+1; j<Math.min(k+4,lines.length); j++) {
      if (/\bINE[A-Z0-9]{10}\b/.test(lines[j])) break;
      if (/^Sub Total/.test(lines[j])) break;
      const textOnly = lines[j].replace(/[\d,]+\.\d+/g,"").trim();
      if (textOnly.length>1) companyExtra += " " + textOnly;
    }

    const companyName = (companyFirst+companyExtra).replace(/\s+/g," ").trim();

    // qty=first num, price=second-to-last, value=last
    // But we must filter the 0.000 balance columns
    // From format: CurrentBal FreeBal LentBal SafekeepBal LockedBal PledgeBal EarmarkedBal PledgeSetupBal PledgeeBal Price Value
    // Typically: qty 0 0 0 0 0 0 0 0 price value
    // So last 2 non-zero numbers are price and value
    const nonZero = ns.filter(v=>v>0);

    if (nonZero.length>=2) {
      const quantity = nonZero[0];
      const value = nonZero[nonZero.length-1];
      const marketPrice = nonZero.length>=2 ? nonZero[nonZero.length-2] : undefined;

      if (quantity>0 && value>0) {
        out.push({
          isin, companyName, quantity,
          marketPrice: marketPrice!==value ? marketPrice : undefined,
          value, dpName, accountType:"CDSL", holdingType,
        });
      }
    }
  }
  return out;
}

// ── Bond parser ───────────────────────────────────────────────────────────
// "INE906B07IN1   NATIONAL   5.00   31-May-2026   500   10,000.00   Not Available   50,00,000.00"
function parseBonds(text: string): Bond[] {
  const bonds: Bond[] = [];
  const seen = new Set<string>();
  let from = 0;
  while(true) {
    const s = text.indexOf("Corporate Bonds (C)", from);
    if (s===-1) break;
    let e = text.indexOf("Sub Total", s);
    if (e===-1) e=s+5000;
    const lines = text.slice(s,e).split("\n").map(l=>l.trim()).filter(Boolean);
    for (let k=0; k<lines.length; k++) {
      const line = lines[k];
      const isinM = line.match(/\b(INE[A-Z0-9]{10})\b/);
      if (!isinM) continue;
      const isin = isinM[1];
      if (seen.has(isin)) continue;
      const combined = [line,lines[k+1]||"",lines[k+2]||""].join(" ");
      const matM = combined.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
      const hasNA = combined.includes("Not Available");
      const ns = [...combined.matchAll(/([\d,]+\.?\d*)/g)].map(m=>num(m[1])).filter(v=>v>0);
      const value = ns[ns.length-1];
      const noOfBonds = ns[ns.length-(hasNA?2:3)];
      const faceValue = ns[ns.length-(hasNA?3:4)];
      const afterIsin = line.slice(line.indexOf(isin)+12);
      const co = afterIsin.replace(/[\d,\.]+.*/s,"").trim();
      if (value>0) {
        seen.add(isin);
        bonds.push({isin,companyName:co.slice(0,80),maturityDate:matM?matM[1]:undefined,noOfBonds,faceValuePerBond:faceValue,value,dpName:""});
      }
    }
    from = e;
  }
  return bonds;
}

// ── AIF parser ────────────────────────────────────────────────────────────
// "INF0RO422058   360 ONE MULTI-STRATEGY FUND - SERIES 2   9,81,074.214   12.36   1,21,27,058.35"
// "CLASS A1 - Restricted Transferability"
function parseAIF(text: string): AIF[] {
  const aifs: AIF[] = [];
  const seen = new Set<string>();
  let from = 0;
  while(true) {
    const s = text.indexOf("Alternate Investment Fund (A)", from);
    if (s===-1) break;
    let e = text.indexOf("Sub Total", s);
    if (e===-1) e=s+10000;
    const lines = text.slice(s,e).split("\n").map(l=>l.trim()).filter(Boolean);
    for (let k=0; k<lines.length; k++) {
      const line = lines[k];
      const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
      if (!isinM) continue;
      const isin = isinM[1];
      if (seen.has(isin)) continue;
      const afterIsin = line.slice(line.indexOf(isin)+12).trim();
      const ns = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m=>num(m[1])).filter(v=>v>0);
      if (ns.length>=3) {
        const units=ns[0], nav=ns[1], value=ns[2];
        const desc = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();
        const desc2 = (lines[k+1]||"").replace(/[\d,]+\.\d+/g,"").trim();
        seen.add(isin);
        aifs.push({isin,description:(desc+" "+desc2).slice(0,120).trim(),units,nav,value,dpName:""});
      }
    }
    from = e;
  }
  return aifs;
}

// ── Portfolio trend ───────────────────────────────────────────────────────
function parseTrend(text: string): PortfolioTrend[] {
  const t: PortfolioTrend[] = [];
  const re = /\b((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})\s+([\d,]+\.\d+)(?:\s+([+\-][\d,]+\.\d+))?(?:\s+([+\-]\d+\.\d+))?/g;
  let m;
  while((m=re.exec(text))!==null) t.push({month:m[1],value:num(m[2]),change:m[3]?num(m[3]):undefined,changePct:m[4]?parseFloat(m[4]):undefined});
  return t;
}

// ── NSDL main parser ──────────────────────────────────────────────────────
function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const investor: InvestorInfo = {name:"",pan:"",casType:"NSDL"};

  const nsdlIdx = lines.findIndex(l=>/NSDL ID:/.test(l));
  if (nsdlIdx!==-1 && lines[nsdlIdx+1]) investor.name=lines[nsdlIdx+1];
  const panM = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panM) investor.pan=panM[1];
  const pvM = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE\s*[`₹]?\s*([\d,]+\.?\d*)/);
  if (pvM) investor.totalPortfolioValue=num(pvM[1]);
  const perM = text.match(/Statement for the period from ([\d\-A-Za-z]+ to [\d\-A-Za-z]+)/);
  if (perM) investor.statementPeriod=perM[1];

  const fpDates = getFirstPurchaseDates(text);
  const mutualFunds = parseMF(text, fpDates);

  // Parse equities — split text into demat account blocks
  const equities: Equity[] = [];

  // Find all demat account blocks by splitting on the header pattern
  // Header: "NSDL Demat Account\n  BROKER NAME\n  DP ID:"
  // or "CDSL Demat Account\n  BROKER NAME\n  DP ID:"
  const blocks = text.split(/(?=(?:NSDL|CDSL) Demat Account\b)/);

  for (const block of blocks) {
    const isNSDL = block.startsWith("NSDL Demat Account");
    const isCDSL = block.startsWith("CDSL Demat Account");
    if (!isNSDL && !isCDSL) continue;

    // DP name: look for ALL CAPS line after the header line
    const bLines = block.split("\n").map(l=>l.trim()).filter(Boolean);
    let dpName = "";
    for (let k=1; k<Math.min(8,bLines.length); k++) {
      const l = bLines[k];
      if (/^[A-Z][A-Z0-9\s\.\&\-\(\)]+$/.test(l) &&
          l.length>4 && l.length<80 &&
          !l.match(/^(DP |ACCOUNT|CLIENT|JOINT|HOLDER|NOMINEE)/) &&
          !l.match(/^\d/)) {
        dpName = l;
        break;
      }
    }

    if (isNSDL) equities.push(...parseNSDLEquities(block, dpName));
    else equities.push(...parseCDSLEquities(block, dpName));
  }

  return {investor,mutualFunds,equities,bonds:parseBonds(text),aif:parseAIF(text),portfolioTrend:parseTrend(text)};
}

// ── CAMS parser ───────────────────────────────────────────────────────────
function parseCAMS(text: string): ParsedCAS {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const investor: InvestorInfo = {name:"",pan:"",casType:"CAMS_KFINTECH"};
  const eIdx = lines.findIndex(l=>l.toLowerCase().startsWith("email id:"));
  if (eIdx!==-1 && lines[eIdx+1]) investor.name=lines[eIdx+1];
  const dateM = text.match(/As on (\d{2}-\w+-\d{4})/);
  if (dateM) investor.statementDate=dateM[1];
  const fpDates = getFirstPurchaseDates(text);
  const mfs: MutualFund[] = [];
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;
    const isin = isinM[1];
    let folioNo = "";
    for (let k=i; k>=Math.max(0,i-3); k--) {
      const fm = lines[k].match(/\b(\d{5,}(?:\/\d+)?)\b/);
      if (fm){folioNo=fm[1];break;}
    }
    const afterIsin = line.slice(line.indexOf(isin)+12).replace(/\(Non.?Demat\)/gi,"").trim();
    const scheme = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();
    const block = lines.slice(i,Math.min(i+5,lines.length)).join(" ");
    const ns = [...block.matchAll(/([\d,]+\.\d+)/g)].map(m=>num(m[1])).filter(v=>v>0);
    const navDateM = block.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
    const reg = /KFINTECH/i.test(block)?"KFINTECH":"CAMS";
    if (folioNo && scheme && ns.length>=3) {
      const [c,u,nav,val] = ns.length>=4?ns:[0,...ns];
      if (u>0&&val>0&&!mfs.find(m=>m.isin===isin&&m.folioNo===folioNo)) {
        mfs.push({folioNo,isin,schemeName:scheme,planType:isDirect(scheme)?"DIRECT":"REGULAR",totalCost:c,units:u,nav,navDate:navDateM?navDateM[1]:"",currentValue:val,registrar:reg as any,firstPurchaseDate:fpDates[folioNo]});
      }
    }
  }
  investor.totalPortfolioValue = mfs.reduce((s,m)=>s+m.currentValue,0);
  return {investor,mutualFunds:mfs,equities:[],bonds:[],aif:[],portfolioTrend:[]};
}

// ── Main ──────────────────────────────────────────────────────────────────
export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buf = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf),password}).promise;
  } catch(e:any) {
    if (e?.name==="PasswordException") throw new Error("WRONG_PASSWORD");
    throw new Error("PDF_ERROR: "+e?.message);
  }
  const text = await extractText(pdf);
  const casType = text.includes("National Securities Depository") ? "NSDL"
    : (text.includes("KFINTECH")||text.includes("CAMS")) ? "CAMS_KFINTECH" : "UNKNOWN";
  let result: ParsedCAS;
  if (casType==="CAMS_KFINTECH") { result=parseCAMS(text); }
  else { result=parseNSDL(text); result.investor.casType="NSDL"; }
  result.rawText = text;
  return result;
}
