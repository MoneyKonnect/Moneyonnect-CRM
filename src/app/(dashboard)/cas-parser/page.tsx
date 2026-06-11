"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Download, Loader2, Eye, EyeOff, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

function formatINR(n: number) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

type Tab = "summary" | "mf" | "equities" | "bonds" | "aif";

interface MF { folio: string; amc: string; scheme: string; isin: string; open: number; close: number; nav: number; value: number; plan: string; }
interface Equity { isin: string; symbol: string; company: string; quantity: number; price: number; value: number; dp: string; type: string; holding: "DIRECT" | "PMS"; }
interface Bond { isin: string; company: string; quantity: number; faceValue: number; value: number; dp: string; }
interface AIF { isin: string; description: string; units: number; nav: number; value: number; dp: string; }

export default function CASParserPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [equityTypes, setEquityTypes] = useState<Record<string, "DIRECT" | "PMS">>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setFile(f); setRaw(null); setError(null); }
    else setError("Please upload a PDF file.");
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setRaw(null); setError(null); }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      const res = await fetch("/api/cas-parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setRaw(data);
      setActiveTab("summary");
      // init equity types
      const types: Record<string, "DIRECT" | "PMS"> = {};
      (data.demat_accounts || []).forEach((acct: any) => {
        (acct.equities || []).forEach((_: any, i: number) => {
          types[`${acct.dp_id}-${i}`] = "DIRECT";
        });
      });
      setEquityTypes(types);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  // Flatten data from casparser JSON structure
  const mfList: MF[] = [];
  const equityList: Equity[] = [];
  const bondList: Bond[] = [];
  const aifList: AIF[] = [];

  if (raw) {
    // Mutual funds from folios
    (raw.folios || []).forEach((folio: any) => {
      (folio.schemes || []).forEach((scheme: any) => {
        mfList.push({
          folio: folio.folio,
          amc: folio.amc,
          scheme: scheme.scheme,
          isin: scheme.isin || "",
          open: scheme.open || 0,
          close: scheme.close || 0,
          nav: scheme.nav || 0,
          value: scheme.valuation?.value || 0,
          plan: /direct/i.test(scheme.scheme) ? "DIRECT" : "REGULAR",
        });
      });
    });

    // Equities, bonds, AIFs from demat accounts
    (raw.demat_accounts || []).forEach((acct: any) => {
      const dp = acct.dp_name || acct.dp_id || "";
      const PMS_BROKERS = ["AXIS SECURITIES", "AMBIT CAPITAL", "360 ONE", "ASK", "MOTILAL OSWAL", "EDELWEISS", "NUVAMA", "WHITE OAK", "ABAKKUS", "MARCELLUS"];
      const defaultHolding: "DIRECT" | "PMS" = PMS_BROKERS.some(b => dp.toUpperCase().includes(b)) ? "PMS" : "DIRECT";

      (acct.equities || []).forEach((eq: any, i: number) => {
        const key = `${acct.dp_id}-${i}`;
        equityList.push({
          isin: eq.isin, symbol: eq.symbol || "", company: eq.name || eq.description || "",
          quantity: eq.quantity || eq.free_balance || 0,
          price: eq.market_price || 0, value: eq.value || 0,
          dp, type: acct.depository || "NSDL",
          holding: equityTypes[key] || defaultHolding,
        });
      });

      (acct.bonds || []).forEach((b: any) => {
        bondList.push({ isin: b.isin, company: b.name || b.description || "", quantity: b.quantity || 0, faceValue: b.face_value || 0, value: b.value || 0, dp });
      });

      (acct.aif || []).forEach((a: any) => {
        aifList.push({ isin: a.isin, description: a.name || a.description || "", units: a.units || 0, nav: a.nav || 0, value: a.value || 0, dp });
      });
    });
  }

  const totalMF = mfList.reduce((s, m) => s + m.value, 0);
  const totalEqDirect = equityList.filter(e => e.holding === "DIRECT").reduce((s, e) => s + e.value, 0);
  const totalEqPMS = equityList.filter(e => e.holding === "PMS").reduce((s, e) => s + e.value, 0);
  const totalBonds = bondList.reduce((s, b) => s + b.value, 0);
  const totalAIF = aifList.reduce((s, a) => s + a.value, 0);

  const handleExport = () => {
    if (!raw) return;
    const wb = XLSX.utils.book_new();
    const summary = [
      ["CAS Parser — MoneyKonnect CRM"], [],
      ["Investor", raw.investor?.name || ""], ["PAN", raw.investor?.pan || ""],
      ["Statement Period", raw.statement_period ? `${raw.statement_period.from} to ${raw.statement_period.to}` : ""],
      [], ["Asset Class", "Value (₹)"],
      ["Mutual Funds", totalMF], ["Equities (Direct)", totalEqDirect],
      ["Equities (PMS)", totalEqPMS], ["Bonds", totalBonds], ["AIF", totalAIF],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    if (mfList.length > 0) {
      const h = ["Folio", "AMC", "Scheme", "ISIN", "Plan", "Open Units", "Close Units", "NAV (₹)", "Value (₹)"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...mfList.map(m => [m.folio, m.amc, m.scheme, m.isin, m.plan, m.open, m.close, m.nav, m.value])]), "Mutual Funds");
    }
    if (equityList.filter(e => e.holding === "DIRECT").length > 0) {
      const h = ["ISIN", "Symbol", "Company", "Quantity", "Price (₹)", "Value (₹)", "Depository", "DP"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...equityList.filter(e => e.holding === "DIRECT").map(e => [e.isin, e.symbol, e.company, e.quantity, e.price, e.value, e.type, e.dp])]), "Equities - Direct");
    }
    if (equityList.filter(e => e.holding === "PMS").length > 0) {
      const h = ["ISIN", "Symbol", "Company", "Quantity", "Price (₹)", "Value (₹)", "Depository", "DP"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...equityList.filter(e => e.holding === "PMS").map(e => [e.isin, e.symbol, e.company, e.quantity, e.price, e.value, e.type, e.dp])]), "Equities - PMS");
    }
    if (bondList.length > 0) {
      const h = ["ISIN", "Company", "Quantity", "Face Value (₹)", "Value (₹)", "DP"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...bondList.map(b => [b.isin, b.company, b.quantity, b.faceValue, b.value, b.dp])]), "Bonds");
    }
    if (aifList.length > 0) {
      const h = ["ISIN", "Fund Name", "Units", "NAV (₹)", "Value (₹)", "DP"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...aifList.map(a => [a.isin, a.description, a.units, a.nav, a.value, a.dp])]), "AIF");
    }
    const name = raw.investor?.name?.replace(/\s+/g, "_") || "CAS";
    XLSX.writeFile(wb, `${name}_CAS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "summary", label: "Summary" },
    { id: "mf", label: "Mutual Funds", count: mfList.length },
    { id: "equities", label: "Equities", count: equityList.length },
    { id: "bonds", label: "Bonds", count: bondList.length },
    { id: "aif", label: "AIF", count: aifList.length },
  ];

  return (
    <div className="p-6 max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">CAS Statement Parser</h1>
            <p className="text-sm text-muted-foreground">Parse NSDL, CDSL, CAMS & KFintech statements into Excel</p>
          </div>
        </div>
        {raw && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-all">
            <Download className="h-4 w-4" /> Download Excel
          </button>
        )}
      </div>

      {!raw && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn("rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              dragging ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/50 hover:bg-accent/30")}>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", file ? "bg-brand-500/10" : "bg-muted")}>
              {file ? <CheckCircle2 className="h-7 w-7 text-brand-400" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
            </div>
            {file ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-brand-400">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Drop your CAS PDF here</p>
                <p className="text-xs text-muted-foreground mt-1">NSDL · CDSL · CAMS · KFintech</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">PDF Password</h3>
              <p className="text-xs text-muted-foreground">NSDL/CDSL: your PAN (e.g. ABCDE1234F). CAMS/KFintech: leave blank if unlocked.</p>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value.toUpperCase())} placeholder="ABCDE1234F"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 text-foreground pr-12" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <button onClick={handleParse} disabled={!file || parsing}
              className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {parsing ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing PDF...</> : <><FileText className="h-4 w-4" /> Parse Statement</>}
            </button>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Supported formats:</p>
              {["NSDL CAS (Equities + MF + AIF + Bonds)", "CDSL CAS (Equities + MF)", "CAMS + KFintech (MF only)"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="h-3 w-3 text-brand-400" />{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {raw && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400">{raw.file_type || "CAS"}</div>
              <span className="text-sm text-muted-foreground">{raw.investor?.name} {raw.investor?.pan && `· ${raw.investor.pan}`}</span>
            </div>
            <button onClick={() => { setRaw(null); setFile(null); setPassword(""); setError(null); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Parse another
            </button>
          </div>

          <div className="flex gap-1 border-b border-border">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                  activeTab === tab.id ? "border-brand-500 text-brand-400" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {activeTab === "summary" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Mutual Funds", value: formatINR(totalMF), count: mfList.length + " schemes" },
                    { label: "Equities (Direct)", value: formatINR(totalEqDirect), count: equityList.filter(e => e.holding === "DIRECT").length + " stocks" },
                    { label: "Equities (PMS)", value: formatINR(totalEqPMS), count: equityList.filter(e => e.holding === "PMS").length + " stocks" },
                    { label: "Bonds + AIF", value: formatINR(totalBonds + totalAIF), count: (bondList.length + aifList.length) + " instruments" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold text-brand-400 mt-1">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.count}</p>
                    </div>
                  ))}
                </div>
                {raw.statement_period && <p className="text-xs text-muted-foreground">Statement period: {raw.statement_period.from} to {raw.statement_period.to}</p>}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-3">MF Plan Breakdown</p>
                  <div className="flex gap-6">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">Direct</span>
                      <p className="text-sm font-bold mt-1">{mfList.filter(m => m.plan === "DIRECT").length} schemes</p>
                      <p className="text-xs text-muted-foreground">{formatINR(mfList.filter(m => m.plan === "DIRECT").reduce((s, m) => s + m.value, 0))}</p>
                    </div>
                    <div className="w-px bg-border" />
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400">Regular</span>
                      <p className="text-sm font-bold mt-1">{mfList.filter(m => m.plan === "REGULAR").length} schemes</p>
                      <p className="text-xs text-muted-foreground">{formatINR(mfList.filter(m => m.plan === "REGULAR").reduce((s, m) => s + m.value, 0))}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "mf" && (
              <div className="overflow-x-auto">
                {mfList.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No mutual funds found.</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["Folio", "AMC", "Scheme", "Plan", "Open Units", "Close Units", "NAV (₹)", "Value"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {mfList.map((m, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{m.folio}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{m.amc}</td>
                          <td className="py-2.5 px-4 max-w-[220px]"><div className="truncate" title={m.scheme}>{m.scheme}</div></td>
                          <td className="py-2.5 px-4">
                            <span className={cn("px-2 py-0.5 rounded-full text-2xs font-semibold", m.plan === "DIRECT" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400")}>
                              {m.plan === "DIRECT" ? "Direct" : "Regular"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">{m.open.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                          <td className="py-2.5 px-4 text-right">{m.close.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                          <td className="py-2.5 px-4 text-right">{m.nav.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(m.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-muted/20"><td colSpan={7} className="py-2.5 px-4 font-semibold text-right">Total</td><td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(totalMF)}</td></tr></tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "equities" && (
              <div className="overflow-x-auto">
                {equityList.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No equities found.</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Symbol", "Company", "Qty", "Price (₹)", "Value", "Type", "DP", "Holding"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {equityList.map((eq, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{eq.isin}</td>
                          <td className="py-2.5 px-4 font-semibold text-brand-400">{eq.symbol || "—"}</td>
                          <td className="py-2.5 px-4 max-w-[180px]"><div className="truncate" title={eq.company}>{eq.company}</div></td>
                          <td className="py-2.5 px-4 text-right">{eq.quantity.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-4 text-right">{eq.price > 0 ? eq.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(eq.value)}</td>
                          <td className="py-2.5 px-4"><span className={cn("px-2 py-0.5 rounded-full text-2xs font-medium", eq.type === "NSDL" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400")}>{eq.type}</span></td>
                          <td className="py-2.5 px-4 text-muted-foreground max-w-[120px]"><div className="truncate" title={eq.dp}>{eq.dp}</div></td>
                          <td className="py-2.5 px-4">
                            <button onClick={() => setEquityTypes(prev => ({ ...prev, [`${i}`]: prev[`${i}`] === "PMS" ? "DIRECT" : "PMS" }))}
                              className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold cursor-pointer border",
                                (equityTypes[`${i}`] || eq.holding) === "PMS" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")}>
                              <Tag className="h-2.5 w-2.5" />{equityTypes[`${i}`] || eq.holding}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-muted/20"><td colSpan={5} className="py-2.5 px-4 font-semibold text-right">Total</td><td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(totalEqDirect + totalEqPMS)}</td><td colSpan={3} /></tr></tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "bonds" && (
              <div className="overflow-x-auto">
                {bondList.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No bonds found.</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Company", "Quantity", "Face Value (₹)", "Value", "DP"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {bondList.map((b, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{b.isin}</td>
                          <td className="py-2.5 px-4">{b.company}</td>
                          <td className="py-2.5 px-4 text-right">{b.quantity}</td>
                          <td className="py-2.5 px-4 text-right">{formatINR(b.faceValue)}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(b.value)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{b.dp}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-muted/20"><td colSpan={4} className="py-2.5 px-4 font-semibold text-right">Total</td><td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(totalBonds)}</td><td /></tr></tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "aif" && (
              <div className="overflow-x-auto">
                {aifList.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No AIF found.</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Fund Name", "Units", "NAV (₹)", "Value", "DP"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {aifList.map((a, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{a.isin}</td>
                          <td className="py-2.5 px-4 max-w-[250px]"><div className="truncate" title={a.description}>{a.description}</div></td>
                          <td className="py-2.5 px-4 text-right">{a.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                          <td className="py-2.5 px-4 text-right">{a.nav.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(a.value)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{a.dp}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border bg-muted/20"><td colSpan={4} className="py-2.5 px-4 font-semibold text-right">Total</td><td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(totalAIF)}</td><td /></tr></tfoot>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
