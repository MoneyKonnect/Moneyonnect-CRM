"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Download, Loader2, Eye, EyeOff, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCASPDF, ParsedCAS } from "@/lib/cas-parser";
import * as XLSX from "xlsx";

function formatINR(n: number) {
  if (!n) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

type Tab = "summary" | "mf" | "equities" | "bonds" | "aif" | "rawtext";

export default function CASParserPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedCAS | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [equityTypes, setEquityTypes] = useState<Record<string, "DIRECT" | "PMS">>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setFile(f); setResult(null); setError(null); }
    else setError("Please upload a PDF file.");
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true); setError(null);
    try {
      const data = await parseCASPDF(file, password);
      setResult(data);
      const types: Record<string, "DIRECT" | "PMS"> = {};
      data.equities.forEach((eq, i) => { types[`${i}`] = eq.holdingType; });
      setEquityTypes(types);
      setActiveTab("summary");
    } catch (e: any) {
      if (e.message === "WRONG_PASSWORD") setError("Incorrect password. For NSDL CAS, try your PAN number (e.g. ABCDE1234F).");
      else setError("Failed to parse PDF: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ["CAS Parser — MoneyKonnect CRM"], [],
      ["Investor Name", result.investor.name],
      ["PAN", result.investor.pan],
      ["Email", result.investor.email || ""],
      ["Mobile", result.investor.mobile || ""],
      ["Statement Type", result.investor.casType],
      ["Statement Period", result.investor.statementPeriod || result.investor.statementDate || ""],
      ["Total Portfolio Value", result.investor.totalPortfolioValue || ""],
      [],
      ["Asset Class", "Value (₹)"],
      ["Mutual Funds", result.mutualFunds.reduce((s, m) => s + m.currentValue, 0)],
      ["Equities (Direct)", result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "DIRECT").reduce((s, e) => s + e.value, 0)],
      ["Equities (PMS)", result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "PMS").reduce((s, e) => s + e.value, 0)],
      ["Bonds", result.bonds.reduce((s, b) => s + b.value, 0)],
      ["AIF", result.aif.reduce((s, a) => s + a.value, 0)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    if (result.mutualFunds.length > 0) {
      const mfHeaders = ["Folio No", "ISIN", "Scheme Name", "Plan Type", "Registrar", "First Purchase Date", "Units", "Avg Cost/Unit (₹)", "Total Cost (₹)", "NAV (₹)", "NAV Date", "Current Value (₹)", "Unrealised P&L (₹)"];
      const mfRows = result.mutualFunds.map(m => [m.folioNo, m.isin, m.schemeName, m.planType, m.registrar, m.firstPurchaseDate || "", m.units, m.avgCostPerUnit || "", m.totalCost || "", m.nav, m.navDate, m.currentValue, m.unrealisedPnL || ""]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([mfHeaders, ...mfRows]), "Mutual Funds");
    }

    const directEq = result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "DIRECT");
    if (directEq.length > 0) {
      const h = ["ISIN", "Stock Symbol", "Company Name", "Face Value", "Quantity", "Market Price (₹)", "Value (₹)", "Depository", "DP Name"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...directEq.map(e => [e.isin, e.stockSymbol || "", e.companyName, e.faceValue || "", e.quantity, e.marketPrice || "", e.value, e.accountType, e.dpName])]), "Equities - Direct");
    }

    const pmsEq = result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "PMS");
    if (pmsEq.length > 0) {
      const h = ["ISIN", "Stock Symbol", "Company Name", "Face Value", "Quantity", "Market Price (₹)", "Value (₹)", "Depository", "DP/PMS Name"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...pmsEq.map(e => [e.isin, e.stockSymbol || "", e.companyName, e.faceValue || "", e.quantity, e.marketPrice || "", e.value, e.accountType, e.dpName])]), "Equities - PMS");
    }

    if (result.bonds.length > 0) {
      const h = ["ISIN", "Company Name", "Coupon Rate", "Frequency", "Maturity Date", "No. of Bonds", "Face Value/Bond (₹)", "Market Price/Bond (₹)", "Value (₹)"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...result.bonds.map(b => [b.isin, b.companyName, b.couponRate || "", b.frequency || "", b.maturityDate || "", b.noOfBonds || "", b.faceValuePerBond || "", b.marketPricePerBond || "", b.value])]), "Bonds");
    }

    if (result.aif.length > 0) {
      const h = ["ISIN", "Fund Name", "Units", "NAV (₹)", "Value (₹)", "DP/Manager"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...result.aif.map(a => [a.isin, a.description, a.units, a.nav, a.value, a.dpName])]), "AIF");
    }

    if (result.portfolioTrend.length > 0) {
      const h = ["Month", "Portfolio Value (₹)", "Change (₹)", "Change (%)"];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h, ...result.portfolioTrend.map(t => [t.month, t.value, t.change || "", t.changePct || ""])]), "Portfolio Trend");
    }

    const name = result.investor.name?.replace(/\s+/g, "_") || "CAS";
    XLSX.writeFile(wb, `${name}_CAS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "summary", label: "Summary" },
    { id: "mf", label: "Mutual Funds", count: result?.mutualFunds.length },
    { id: "equities", label: "Equities", count: result?.equities.length },
    { id: "bonds", label: "Bonds", count: result?.bonds.length },
    { id: "aif", label: "AIF", count: result?.aif.length },
    { id: "rawtext", label: "🔍 Raw Text" },
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
        {result && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-all">
            <Download className="h-4 w-4" /> Download Excel
          </button>
        )}
      </div>

      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn("rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              dragging ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/50 hover:bg-accent/30")}
          >
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
              <p className="text-xs text-muted-foreground">For NSDL/CDSL CAS — enter PAN (e.g. ABCDE1234F). CAMS/KFintech — leave blank if unlocked.</p>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 text-foreground pr-12"
              />
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

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400">{result.investor.casType}</div>
              <span className="text-sm text-muted-foreground">{result.investor.name} {result.investor.pan && `· ${result.investor.pan}`}</span>
              {result.investor.totalPortfolioValue && <span className="text-sm font-semibold text-foreground">· {formatINR(result.investor.totalPortfolioValue)}</span>}
            </div>
            <button onClick={() => { setResult(null); setFile(null); setPassword(""); setError(null); }}
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">

            {activeTab === "summary" && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Mutual Funds", value: formatINR(result.mutualFunds.reduce((s, m) => s + m.currentValue, 0)), count: result.mutualFunds.length + " schemes" },
                    { label: "Equities (Direct)", value: formatINR(result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "DIRECT").reduce((s, e) => s + e.value, 0)), count: result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "DIRECT").length + " stocks" },
                    { label: "Equities (PMS)", value: formatINR(result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "PMS").reduce((s, e) => s + e.value, 0)), count: result.equities.filter((_, i) => (equityTypes[`${i}`] || _.holdingType) === "PMS").length + " stocks" },
                    { label: "Bonds + AIF", value: formatINR(result.bonds.reduce((s, b) => s + b.value, 0) + result.aif.reduce((s, a) => s + a.value, 0)), count: (result.bonds.length + result.aif.length) + " instruments" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold text-brand-400 mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.count}</p>
                    </div>
                  ))}
                </div>
                {result.investor.statementPeriod && <p className="text-xs text-muted-foreground">Statement period: {result.investor.statementPeriod}</p>}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-3">MF Plan Breakdown</p>
                  <div className="flex gap-6">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">Direct</span>
                      <p className="text-sm font-bold mt-1">{result.mutualFunds.filter(m => m.planType === "DIRECT").length} schemes</p>
                      <p className="text-xs text-muted-foreground">{formatINR(result.mutualFunds.filter(m => m.planType === "DIRECT").reduce((s, m) => s + m.currentValue, 0))}</p>
                    </div>
                    <div className="w-px bg-border" />
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400">Regular</span>
                      <p className="text-sm font-bold mt-1">{result.mutualFunds.filter(m => m.planType === "REGULAR").length} schemes</p>
                      <p className="text-xs text-muted-foreground">{formatINR(result.mutualFunds.filter(m => m.planType === "REGULAR").reduce((s, m) => s + m.currentValue, 0))}</p>
                    </div>
                  </div>
                </div>
                {result.portfolioTrend.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Portfolio Value Trend</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-border">{["Month", "Value", "Change", "Change %"].map(h => <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>)}</tr></thead>
                        <tbody>
                          {result.portfolioTrend.map((t, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                              <td className="py-2 px-3 font-medium">{t.month}</td>
                              <td className="py-2 px-3">{formatINR(t.value)}</td>
                              <td className={cn("py-2 px-3", t.change && t.change > 0 ? "text-emerald-400" : "text-red-400")}>{t.change ? formatINR(t.change) : "—"}</td>
                              <td className={cn("py-2 px-3", t.changePct && t.changePct > 0 ? "text-emerald-400" : "text-red-400")}>{t.changePct ? `${t.changePct > 0 ? "+" : ""}${t.changePct}%` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "mf" && (
              <div className="overflow-x-auto">
                {result.mutualFunds.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No mutual funds found.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["Folio No", "Scheme Name", "Plan", "Registrar", "First Purchase", "Units", "NAV (₹)", "NAV Date", "Current Value", "P&L"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {result.mutualFunds.map((m, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{m.folioNo}</td>
                          <td className="py-2.5 px-4 max-w-[200px]"><div className="truncate" title={m.schemeName}>{m.schemeName}</div></td>
                          <td className="py-2.5 px-4">
                            <span className={cn("px-2 py-0.5 rounded-full text-2xs font-semibold", m.planType === "DIRECT" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400")}>
                              {m.planType === "DIRECT" ? "Direct" : "Regular"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4"><span className={cn("px-2 py-0.5 rounded-full text-2xs font-medium", m.registrar === "CAMS" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400")}>{m.registrar}</span></td>
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{m.firstPurchaseDate || "—"}</td>
                          <td className="py-2.5 px-4 text-right">{m.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                          <td className="py-2.5 px-4 text-right">{m.nav.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{m.navDate}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(m.currentValue)}</td>
                          <td className={cn("py-2.5 px-4 text-right", m.unrealisedPnL && m.unrealisedPnL >= 0 ? "text-emerald-400" : "text-red-400")}>{m.unrealisedPnL ? formatINR(m.unrealisedPnL) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={8} className="py-2.5 px-4 font-semibold text-right">Total</td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(result.mutualFunds.reduce((s, m) => s + m.currentValue, 0))}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-emerald-400">{formatINR(result.mutualFunds.reduce((s, m) => s + (m.unrealisedPnL || 0), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "equities" && (
              <div className="overflow-x-auto">
                {result.equities.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No equity holdings found.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Symbol", "Company", "Qty", "Price (₹)", "Value", "Depository", "DP / Broker", "Type"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {result.equities.map((eq, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{eq.isin}</td>
                          <td className="py-2.5 px-4 font-semibold text-brand-400">{eq.stockSymbol || "—"}</td>
                          <td className="py-2.5 px-4 max-w-[180px]"><div className="truncate" title={eq.companyName}>{eq.companyName}</div></td>
                          <td className="py-2.5 px-4 text-right">{eq.quantity.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-4 text-right">{eq.marketPrice?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) || "—"}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(eq.value)}</td>
                          <td className="py-2.5 px-4"><span className={cn("px-2 py-0.5 rounded-full text-2xs font-medium", eq.accountType === "NSDL" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400")}>{eq.accountType}</span></td>
                          <td className="py-2.5 px-4 text-muted-foreground max-w-[140px]"><div className="truncate" title={eq.dpName}>{eq.dpName}</div></td>
                          <td className="py-2.5 px-4">
                            <button onClick={() => setEquityTypes(prev => ({ ...prev, [`${i}`]: prev[`${i}`] === "PMS" ? "DIRECT" : "PMS" }))}
                              className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold transition-all cursor-pointer border",
                                (equityTypes[`${i}`] || eq.holdingType) === "PMS" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")}>
                              <Tag className="h-2.5 w-2.5" />{equityTypes[`${i}`] || eq.holdingType}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={5} className="py-2.5 px-4 font-semibold text-right">Total</td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(result.equities.reduce((s, e) => s + e.value, 0))}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "bonds" && (
              <div className="overflow-x-auto">
                {result.bonds.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No bonds found.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Company", "Coupon Rate", "Frequency", "Maturity Date", "No. of Bonds", "Face Value/Bond", "Market Price/Bond", "Value"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {result.bonds.map((b, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{b.isin}</td>
                          <td className="py-2.5 px-4 max-w-[180px]"><div className="truncate" title={b.companyName}>{b.companyName}</div></td>
                          <td className="py-2.5 px-4">{b.couponRate || "—"}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{b.frequency || "—"}</td>
                          <td className="py-2.5 px-4">{b.maturityDate || "—"}</td>
                          <td className="py-2.5 px-4 text-right">{b.noOfBonds?.toLocaleString("en-IN") || "—"}</td>
                          <td className="py-2.5 px-4 text-right">{b.faceValuePerBond ? formatINR(b.faceValuePerBond) : "—"}</td>
                          <td className="py-2.5 px-4 text-right">{b.marketPricePerBond ? formatINR(b.marketPricePerBond) : "Not Available"}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(b.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={8} className="py-2.5 px-4 font-semibold text-right">Total</td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(result.bonds.reduce((s, b) => s + b.value, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === "aif" && (
              <div className="overflow-x-auto">
                {result.aif.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No AIF holdings found.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-muted/30">{["ISIN", "Fund Name", "Units", "NAV (₹)", "Value", "Manager / DP"].map(h => <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {result.aif.map((a, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground text-2xs">{a.isin}</td>
                          <td className="py-2.5 px-4 max-w-[250px]"><div className="truncate" title={a.description}>{a.description}</div></td>
                          <td className="py-2.5 px-4 text-right">{a.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                          <td className="py-2.5 px-4 text-right">{a.nav.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatINR(a.value)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{a.dpName}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={4} className="py-2.5 px-4 font-semibold text-right">Total</td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-400">{formatINR(result.aif.reduce((s, a) => s + a.value, 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* RAW TEXT DEBUG TAB */}
            {activeTab === "rawtext" && (
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Raw extracted text — use this to debug parsing issues. Copy a section and share with the developer.</p>
                <textarea
                  readOnly
                  value={result.rawText || ""}
                  className="w-full h-[600px] font-mono text-xs bg-background border border-border rounded-xl p-4 resize-none text-foreground"
                />
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
