"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, RefreshCw, TrendingUp, Users, IndianRupee, CheckCircle, AlertCircle, Loader2, X, FileText, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ULTRA_HNI: { label: "Ultra HNI", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  HNI:       { label: "HNI",       color: "text-amber-400",   bg: "bg-amber-500/10" },
  PREMIUM:   { label: "Premium",   color: "text-violet-400",  bg: "bg-violet-500/10" },
  STANDARD:  { label: "Standard",  color: "text-blue-400",    bg: "bg-blue-500/10" },
  RETAIL:    { label: "Retail",    color: "text-muted-foreground", bg: "bg-muted" },
};

function formatCr(n: number): string {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

interface AUMClientProps {
  totalAUM: number;
  clientCount: number;
  categoryBreakdown: { category: string; aum: number; count: number }[];
  topClients: { id: string; fullName: string; aum: number; category: string; city: string | null; residency: { residencyType: string } | null }[];
  lastUpdated: string | null;
}

export default function AUMClient({ totalAUM, clientCount, categoryBreakdown, topClients, lastUpdated }: AUMClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const csvFiles = Array.from(newFiles).filter(f => f.name.endsWith(".csv"));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...csvFiles.filter(f => !existing.has(f.name))];
    });
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleSync = async () => {
    if (!files.length) { toast.error("Please upload at least one CSV file"); return; }
    setSyncing(true);
    setResult(null);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    try {
      const res = await fetch("/api/sync/aum", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Sync failed"); return; }
      setResult(data);
      toast.success(data.message);
      router.refresh();
      setFiles([]);
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  const clientsWithAUM = categoryBreakdown.reduce((a, c) => a + c.count, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-brand-400" /> AUM Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastUpdated ? `Last synced: ${new Date(lastUpdated).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Not synced yet"}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground">Total AUM</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCr(totalAUM)}</p>
          <p className="text-xs text-muted-foreground mt-1">{clientsWithAUM} clients with AUM data</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-bold text-foreground mt-1">{clientCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{clientCount - clientsWithAUM} without AUM data</p>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <p className="text-xs text-muted-foreground">Avg AUM per Client</p>
          <p className="text-2xl font-bold text-foreground mt-1">{clientsWithAUM ? formatCr(totalAUM / clientsWithAUM) : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">across active clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AUM Sync */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-brand-400" /> Sync AUM Data
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload CAMS + Kfintech CSVs to update all client AUMs in one click</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                dragOver ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/50 hover:bg-accent/30"
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Drop CSV files here</p>
              <p className="text-xs text-muted-foreground mt-1">CAMS AUM file + Kfintech file (both supported)</p>
              <input ref={fileInput} type="file" accept=".csv" multiple className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map(f => (
                  <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <FileText className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                    <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.name); }} className="text-muted-foreground hover:text-danger transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncing || !files.length}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-all"
            >
              {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing AUM...</> : <><RefreshCw className="h-4 w-4" /> Sync AUM Now</>}
            </button>

            {/* Result */}
            {result && (
              <div className={cn("rounded-xl p-4 space-y-3 border", result.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-danger/5 border-danger/20")}>
                <div className="flex items-center gap-2">
                  {result.success ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-danger" />}
                  <p className="text-sm font-medium text-foreground">{result.message}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-lg font-bold text-emerald-400">{result.updated}</p>
                    <p className="text-2xs text-muted-foreground">Updated</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-lg font-bold text-muted-foreground">{result.notFound}</p>
                    <p className="text-2xs text-muted-foreground">Not found</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-lg font-bold text-brand-400">{formatCr(result.totalAUM)}</p>
                    <p className="text-2xs text-muted-foreground">Total AUM</p>
                  </div>
                </div>
                {result.significantChanges?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Significant changes:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.significantChanges.map((c: string, i: number) => (
                        <p key={i} className="text-xs text-foreground">{c}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">How to export from CAMS:</p>
              <p className="text-xs text-muted-foreground">CAMS → Reports → Broker Reports → Consolidated AUM Report → Download CSV</p>
              <p className="text-xs font-medium text-foreground mt-2">How to export from Kfintech:</p>
              <p className="text-xs text-muted-foreground">Kfintech → MIS → Portfolio Report → Active Folios → Download CSV</p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">AUM by Category</h2>
          </div>
          <div className="p-4 space-y-3">
            {categoryBreakdown.sort((a, b) => b.aum - a.aum).map(cat => {
              const cfg = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.STANDARD;
              const pct = totalAUM > 0 ? (cat.aum / totalAUM) * 100 : 0;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.count} clients</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCr(cat.aum)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top 10 Clients by AUM</h2>
        </div>
        <div className="divide-y divide-border">
          {topClients.map((client, i) => {
            const cfg = CATEGORY_CONFIG[client.category] || CATEGORY_CONFIG.STANDARD;
            return (
              <div key={client.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{client.fullName}</p>
                  <p className="text-xs text-muted-foreground">{client.city || "—"}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>{cfg.label}</span>
                <span className="text-sm font-semibold text-foreground">{formatCr(client.aum)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
