export interface InvestorInfo {
  name: string; pan: string; email?: string; mobile?: string;
  nsdlId?: string; statementDate?: string; statementPeriod?: string;
  totalPortfolioValue?: number; casType: "NSDL"|"CDSL"|"CAMS_KFINTECH"|"UNKNOWN";
}
export interface MutualFund {
  folioNo: string; schemeName: string; isin: string; ucc?: string;
  registrar: string; planType: "DIRECT"|"REGULAR";
  units: number; avgCostPerUnit?: number; totalCost?: number;
  nav: number; navDate: string; currentValue: number;
  unrealisedPnL?: number; firstPurchaseDate?: string;
}
export interface Equity {
  isin: string; stockSymbol?: string; companyName: string;
  faceValue?: number; quantity: number; marketPrice?: number; value: number;
  dpName: string; accountType: "NSDL"|"CDSL"; holdingType: "DIRECT"|"PMS";
}
export interface Bond {
  isin: string; companyName: string; maturityDate?: string;
  noOfBonds?: number; faceValuePerBond?: number; value: number; dpName: string;
}
export interface AIF {
  isin: string; description: string; units: number; nav: number; value: number; dpName: string;
}
export interface PortfolioTrend { month: string; value: number; change?: number; changePct?: number; }
export interface ParsedCAS {
  investor: InvestorInfo; mutualFunds: MutualFund[]; equities: Equity[];
  bonds: Bond[]; aif: AIF[]; portfolioTrend: PortfolioTrend[]; rawText?: string;
}

const PMS_BROKERS = ["AXIS SECURITIES","AMBIT CAPITAL","360 ONE","ASK INVESTMENT",
  "MOTILAL OSWAL","KOTAK MAHINDRA BANK","EDELWEISS","NUVAMA","WHITE OAK",
  "ABAKKUS","MARCELLUS","CARNELIAN"];
const isPMS = (dp: string) => PMS_BROKERS.some(b => dp.toUpperCase().includes(b));
const n = (s: string) => parseFloat((s||"").replace(/,/g,"").replace(/[`₹]/g,"").trim())||0;
const isDirect = (name: string) => /direct/i.test(name);

async function extractText(pdf: any): Promise<string> {
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const {items} = await page.getTextContent() as any;
    const rows = new Map<number,{x:number,s:string}[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y,[]);
      rows.get(y)!.push({x:it.transform[4],s:it.str});
    }
    for (const y of [...rows.keys()].sort((a,b)=>b-a)) {
      const line = rows.get(y)!.sort((a,b)=>a.x-b.x).map(r=>r.s).join("   ").trim();
      if (line) out += line + "\n";
    }
  }
  return out;
}

function getFirstPurchaseDates(text: string): Record<string,string> {
  const out: Record<string,string> = {};
  const idx = text.search(/MUTUAL FUND FOLIOS.*?Transactions|Mutual Funds Transaction Statement/i);
  if (idx===-1) return out;
  for (const block of text.slice(idx).split(/Folio No\s*[-–]\s*/i)) {
    const fm = block.match(/^([\d\/]+)/);
    if (!fm) continue;
    const folio = fm[1];
    const re = /(\d{2}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4})\s+(?:Purchase|SIP|Switch.?In|Allotment|New Purchase)/gi;
    let m, best: Date|null=null, bestStr="";
    while((m=re.exec(block))!==null) {
      const p=m[1].toUpperCase().split("-");
      const M: Record<string,number>={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
      const d=new Date(+p[2],M[p[1]],+p[0]);
      if(!best||d<best){best=d;bestStr=m[1];}
    }
    if(bestStr) out[folio]=bestStr;
  }
  return out;
}

// ── MF parser ─────────────────────────────────────────────────────────────
// Raw text line format (confirmed from vimi.pdf raw text):
// "INF209K01VF2 Aditya Birla Sun Life 1040467325   9,080.778   110.1227   10,00,000.00   165.5700   15,03,504.41   5,03,504.41"
// "MFBRLA0050   Digital India Fund -"
// "Growth-Direct Plan"
function parseMF(text: string, fpDates: Record<string,string>): MutualFund[] {
  const mfs: MutualFund[] = [];
  const start = text.indexOf("Mutual Fund Folios (F)");
  if (start===-1) return mfs;
  let end = text.indexOf("\nTransactions", start);
  if (end===-1) end = text.indexOf("Know more about your accounts", start);
  if (end===-1) end = start+80000;
  const lines = text.slice(start,end).split("\n").map(l=>l.trim()).filter(Boolean);

  // Build registrar map from footer
  const registrarMap: Record<string,string> = {};
  const kmIdx = text.lastIndexOf("Folio No.");
  if (kmIdx!==-1) {
    const km = text.slice(kmIdx);
    const re = /(\d{6,}(?:\/\d+)?)[\s\S]{1,300}?(CAMS|KFIN)\b/g;
    let rm;
    while((rm=re.exec(km))!==null) {
      if (!registrarMap[rm[1]]) registrarMap[rm[1]] = rm[2]==="KFIN"?"KFINTECH":"CAMS";
    }
  }

  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;
    const isin = isinM[1];

    // Folio: long integer on this line (no decimal point)
    const folioM = line.match(/\b(\d{6,}(?:\/\d+)?)\b/);
    if (!folioM) continue;
    const folioNo = folioM[1];

    // All decimal numbers on this line
    const decNums = [...line.matchAll(/([\d,]+\.\d+)/g)].map(m=>n(m[1]));
    if (decNums.length < 4) continue;

    // units avgCost totalCost nav currentValue pnl
    const [units, avgCost, totalCost, nav, currentValue, pnl] = decNums;
    if (!units || !currentValue) continue;

    // Scheme name: on line 1 between ISIN and folio + lines 2-3
    const isinPos = line.indexOf(isin)+12;
    const folioPos = line.indexOf(folioNo);
    const nameOnLine1 = folioPos > isinPos
      ? line.slice(isinPos, folioPos).replace(/\s+/g," ").trim()
      : "";

    // Line 2: "UCC   rest of name"
    const line2 = (lines[i+1]||"");
    const l2parts = line2.split(/\s{2,}/);
    const ucc = l2parts[0]||"";
    const nameOnLine2 = l2parts.slice(1).join(" ").trim();

    // Line 3: continuation (if not new ISIN / folio)
    const line3 = lines[i+2]||"";
    const nameOnLine3 = (!line3.match(/\bINF[A-Z0-9]{9}\b/) && !line3.match(/^\d{6,}/))
      ? line3.replace(/[\d,]+\.\d+/g,"").replace(/\s+/g," ").trim()
      : "";

    const schemeName = [nameOnLine1, nameOnLine2, nameOnLine3]
      .join(" ").replace(/\s+/g," ").replace(/^[-\s]+/,"").trim();

    if (!mfs.find(m=>m.isin===isin&&m.folioNo===folioNo)) {
      mfs.push({
        isin, ucc, schemeName, folioNo,
        planType: isDirect(schemeName)?"DIRECT":"REGULAR",
        units, avgCostPerUnit: avgCost, totalCost, nav,
        navDate:"", currentValue, unrealisedPnL: pnl||undefined,
        registrar: registrarMap[folioNo]||"CAMS",
        firstPurchaseDate: fpDates[folioNo],
      });
    }
  }
  return mfs;
}

// ── NSDL equity parser ────────────────────────────────────────────────────
// Confirmed format from raw text:
// "INE216A01030 BRITANNIA INDUSTRIES LTD   1.00   120   5,204.50   6,24,540.00"
// "BRITANNIA.NSE"
// Numbers at end: faceValue  qty  price  value  (price can be "See Note")
function parseNSDLEquities(text: string): Equity[] {
  const out: Equity[] = [];
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);

  // Track current DP name by scanning for demat account headers
  let dpName = "";
  let inEquitySection = false;
  let inMFSection = false;

  for (let k=0; k<lines.length; k++) {
    const line = lines[k];

    // Detect demat account header — "NSDL Demat Account" followed by broker name on next line
    if (line.startsWith("NSDL Demat Account")) {
      // Next non-empty line that is all caps = broker name
      for (let j=k+1; j<Math.min(k+5,lines.length); j++) {
        const l = lines[j];
        if (l.match(/^[A-Z][A-Z0-9\s\.\&\-\(\)]+$/) && l.length>3 && !l.startsWith("DP ") && !l.startsWith("ACCOUNT")) {
          dpName = l;
          break;
        }
      }
      inEquitySection = false;
      inMFSection = false;
      continue;
    }

    if (line.startsWith("Equity Shares")) { inEquitySection = true; inMFSection = false; continue; }
    if (line === "Mutual Funds (M)" || line === "Mutual Fund Folios (F)") { inMFSection = true; inEquitySection = false; continue; }
    if (line.startsWith("Sub Total") || line.startsWith("Total")) { inEquitySection = false; continue; }

    if (!inEquitySection) continue;

    // Skip header lines
    if (line.includes("Face Value") || line.includes("Stock Symbol") || line.includes("ISIN Company")) continue;

    // Match equity line: must have INE ISIN
    const isinM = line.match(/\b(INE[A-Z0-9]{10}|IN8[A-Z0-9]{9})\b/);
    if (!isinM) continue;

    const isin = isinM[1];
    const nextLine = (lines[k+1]||"").trim();
    const symM = nextLine.match(/^(\w[\w\-]*)\.(?:NSE|BSE)$/);
    const stockSymbol = symM ? symM[1] : undefined;

    const afterIsin = line.slice(line.indexOf(isin)+12).trim();
    const hasSeeNote = afterIsin.includes("See Note") || line.includes("See Note");
    const isSuspended = afterIsin.includes("ISIN SUSPENDED") || nextLine.includes("ISIN SUSPENDED");

    // Extract numbers - filter out See Note
    const cleaned = afterIsin.replace(/See Note/g,"").replace(/ISIN SUSPENDED/g,"").replace(/BLOCKED/g,"");
    const nums = [...cleaned.matchAll(/([\d,]+\.?\d*)/g)]
      .map(m=>n(m[1])).filter(v=>v>=0);

    // Company name = text before first number
    const companyName = cleaned.replace(/[\d,\.]+.*/s,"")
      .replace(/\s+/g," ").trim();

    // NSDL format: faceVal  qty  [price]  value
    // Need at least 3 nums (faceVal + qty + value)
    if (nums.length >= 3) {
      const faceValue = nums[0];
      const quantity = nums[1];
      const value = nums[nums.length-1];
      const marketPrice = (!hasSeeNote && nums.length>=4) ? nums[2] : undefined;

      if (value > 0 || isSuspended) {
        out.push({
          isin, stockSymbol,
          companyName: companyName||"UNKNOWN",
          faceValue, quantity, marketPrice, value,
          dpName: dpName||"UNKNOWN",
          accountType:"NSDL",
          holdingType: isPMS(dpName)?"PMS":"DIRECT",
        });
      }
    }
  }
  return out;
}

// ── CDSL equity parser ────────────────────────────────────────────────────
// Confirmed format from raw text:
// "INE117A01022   ABB INDIA LIMITED - NEW 50.000 0.000 0.000 7,229.60   3,61,480.00"
// "EQUITY SHARES OF RS. 2/- 50.000 0.000 0.000"
// "AFTER SPLIT 0.000 0.000 0.000"
// qty=first num on first line, price=2nd-to-last on first line, value=last on first line
function parseCDSLEquities(text: string): Equity[] {
  const out: Equity[] = [];
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);

  let dpName = "";
  let inEquitySection = false;

  for (let k=0; k<lines.length; k++) {
    const line = lines[k];

    if (line.startsWith("CDSL Demat Account")) {
      for (let j=k+1; j<Math.min(k+5,lines.length); j++) {
        const l = lines[j];
        if (l.match(/^[A-Z][A-Z0-9\s\.\&\-\(\)]+$/) && l.length>3 && !l.startsWith("DP ") && !l.startsWith("ACCOUNT")) {
          dpName = l;
          break;
        }
      }
      inEquitySection = false;
      continue;
    }

    if (line.startsWith("Equities (E)")) { inEquitySection = true; continue; }
    if (line.startsWith("Sub Total") || line.startsWith("Total") || line === "Mutual Fund Folios (F)") {
      inEquitySection = false; continue;
    }

    if (!inEquitySection) continue;
    if (line.includes("ISIN") && line.includes("SECURITY")) continue; // header
    if (line.includes("Current Bal") || line.includes("Free Bal")) continue; // header

    const isinM = line.match(/\b(INE[A-Z0-9]{10})\b/);
    if (!isinM) continue;

    const isin = isinM[1];
    const afterIsin = line.slice(line.indexOf(isin)+12).trim();

    // All decimal numbers on this first line
    // Format: PartialName  qty.000  0.000  0.000  price  value
    const numsOnLine = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m=>n(m[1]));

    // Company name = text before first number
    const companyFirst = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();

    // Collect company name from continuation lines (skip number-heavy lines)
    let extraName = "";
    for (let j=k+1; j<Math.min(k+4,lines.length); j++) {
      if (/\bINE[A-Z0-9]{10}\b/.test(lines[j])) break;
      if (/^Sub Total/.test(lines[j])) break;
      const textOnly = lines[j].replace(/[\d,]+\.\d+/g,"").trim();
      if (textOnly.length > 1 && !/^(ISIN|Current|Free|Lent|Safekeep|Locked|Pledge|Earmarked)/.test(textOnly)) {
        extraName += " " + textOnly;
      }
    }

    const companyName = (companyFirst + extraName).replace(/\s+/g," ").trim();

    // qty = first number, price = 2nd to last, value = last
    // all the 0.000 balance columns sit in between
    const nonZero = numsOnLine.filter(v=>v>0);

    if (nonZero.length >= 2) {
      const quantity = nonZero[0];
      const value = nonZero[nonZero.length-1];
      const marketPrice = nonZero.length >= 2 ? nonZero[nonZero.length-2] : undefined;

      if (quantity > 0 && value > 0) {
        out.push({
          isin, companyName,
          quantity, value,
          marketPrice: marketPrice !== value ? marketPrice : undefined,
          dpName: dpName||"UNKNOWN",
          accountType:"CDSL",
          holdingType: isPMS(dpName)?"PMS":"DIRECT",
        });
      }
    }
  }
  return out;
}

// ── Bond parser ───────────────────────────────────────────────────────────
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
      const nums = [...combined.matchAll(/([\d,]+\.?\d*)/g)].map(m=>n(m[1])).filter(v=>v>0);
      const value = nums[nums.length-1];
      if (value > 0) {
        const afterIsin = line.slice(line.indexOf(isin)+12);
        const co = afterIsin.replace(/[\d,\.]+.*/s,"").trim().slice(0,80);
        seen.add(isin);
        bonds.push({isin, companyName:co, maturityDate:matM?matM[1]:undefined,
          noOfBonds:nums[nums.length-(hasNA?2:3)],
          faceValuePerBond:nums[nums.length-(hasNA?3:4)],
          value, dpName:""});
      }
    }
    from = e;
  }
  return bonds;
}

// ── AIF parser ────────────────────────────────────────────────────────────
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
      const nums = [...afterIsin.matchAll(/([\d,]+\.\d+)/g)].map(m=>n(m[1])).filter(v=>v>0);
      if (nums.length>=3) {
        const desc = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();
        const desc2 = (lines[k+1]||"").replace(/[\d,]+\.\d+/g,"").trim();
        seen.add(isin);
        aifs.push({isin,description:(desc+" "+desc2).slice(0,120).trim(),
          units:nums[0],nav:nums[1],value:nums[2],dpName:""});
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
  while((m=re.exec(text))!==null)
    t.push({month:m[1],value:n(m[2]),change:m[3]?n(m[3]):undefined,changePct:m[4]?parseFloat(m[4]):undefined});
  return t;
}

// ── Main NSDL parser ──────────────────────────────────────────────────────
function parseNSDL(text: string): ParsedCAS {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const investor: InvestorInfo = {name:"",pan:"",casType:"NSDL"};

  const nsdlIdx = lines.findIndex(l=>l.startsWith("NSDL ID:"));
  if (nsdlIdx!==-1 && lines[nsdlIdx+1]) investor.name=lines[nsdlIdx+1];
  const panM = text.match(/PAN:([A-Z]{5}\d{4}[A-Z])/);
  if (panM) investor.pan=panM[1];
  const pvM = text.match(/YOUR CONSOLIDATED PORTFOLIO VALUE[\s\S]{0,30}?([\d,]+\.\d+)/);
  if (pvM) investor.totalPortfolioValue=n(pvM[1]);
  const perM = text.match(/Statement for the period from ([\d\-A-Za-z]+ to [\d\-A-Za-z]+)/);
  if (perM) investor.statementPeriod=perM[1];

  const fpDates = getFirstPurchaseDates(text);

  return {
    investor,
    mutualFunds: parseMF(text, fpDates),
    equities: [...parseNSDLEquities(text), ...parseCDSLEquities(text)],
    bonds: parseBonds(text),
    aif: parseAIF(text),
    portfolioTrend: parseTrend(text),
  };
}

// ── CAMS parser ───────────────────────────────────────────────────────────
function parseCAMS(text: string): ParsedCAS {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const investor: InvestorInfo = {name:"",pan:"",casType:"CAMS_KFINTECH"};
  const eIdx = lines.findIndex(l=>l.toLowerCase().startsWith("email id:"));
  if (eIdx!==-1&&lines[eIdx+1]) investor.name=lines[eIdx+1];
  const dateM = text.match(/As on (\d{2}-\w+-\d{4})/);
  if (dateM) investor.statementDate=dateM[1];
  const fpDates = getFirstPurchaseDates(text);
  const mfs: MutualFund[] = [];
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const isinM = line.match(/\b(INF[A-Z0-9]{9})\b/);
    if (!isinM) continue;
    const isin = isinM[1];
    let folioNo="";
    for (let k=i;k>=Math.max(0,i-3);k--) {
      const fm=lines[k].match(/\b(\d{5,}(?:\/\d+)?)\b/);
      if(fm){folioNo=fm[1];break;}
    }
    const afterIsin = line.slice(line.indexOf(isin)+12).replace(/\(Non.?Demat\)/gi,"").trim();
    const scheme = afterIsin.replace(/[\d,]+\.\d+.*/s,"").trim();
    const block = lines.slice(i,Math.min(i+5,lines.length)).join(" ");
    const nums = [...block.matchAll(/([\d,]+\.\d+)/g)].map(m=>n(m[1])).filter(v=>v>0);
    const navDateM = block.match(/(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})/i);
    const reg = /KFINTECH/i.test(block)?"KFINTECH":"CAMS";
    if (folioNo&&scheme&&nums.length>=3) {
      const [c,u,nav,val]=nums.length>=4?nums:[0,...nums];
      if(u>0&&val>0&&!mfs.find(m=>m.isin===isin&&m.folioNo===folioNo)) {
        mfs.push({folioNo,isin,schemeName:scheme,planType:isDirect(scheme)?"DIRECT":"REGULAR",
          totalCost:c,units:u,nav,navDate:navDateM?navDateM[1]:"",currentValue:val,
          registrar:reg as any,firstPurchaseDate:fpDates[folioNo]});
      }
    }
  }
  investor.totalPortfolioValue=mfs.reduce((s,m)=>s+m.currentValue,0);
  return {investor,mutualFunds:mfs,equities:[],bonds:[],aif:[],portfolioTrend:[]};
}

// ── Main ──────────────────────────────────────────────────────────────────
export async function parseCASPDF(file: File, password: string): Promise<ParsedCAS> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
  const buf = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({data:new Uint8Array(buf),password}).promise;
  } catch(e:any) {
    if(e?.name==="PasswordException") throw new Error("WRONG_PASSWORD");
    throw new Error("PDF_ERROR: "+e?.message);
  }
  const text = await extractText(pdf);
  const isCams = text.includes("KFINTECH")||(!text.includes("National Securities Depository")&&text.includes("CAMS"));
  let result: ParsedCAS;
  if (isCams) { result=parseCAMS(text); }
  else { result=parseNSDL(text); result.investor.casType="NSDL"; }
  result.rawText=text;
  return result;
}
