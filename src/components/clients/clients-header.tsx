"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Users, Search, SlidersHorizontal, Plus,
  Download, Loader2, Upload, UserCheck, UserPlus, Star,
  RefreshCw, X, FileText, CheckCircle, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportClients } from "@/actions/export";

interface ClientsHeaderProps {
  total: number;
  newCount: number;
  convertedCount: number;
  existingCount: number;
}

const TYPE_TABS = [
  { key: "", label: "All Clients", icon: Users, color: "text-foreground" },
  { key: "new", label: "New", icon: UserPlus, color: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { key: "converted", label: "Converted", icon: UserCheck, color: "text-brand-400", badge: "bg-brand-500/15 text-brand-400 border-brand-500/30" },
  { key: "existing", label: "Existing", icon: Star, color: "text-amber-400", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
];

export function ClientsHeader({ total, newCount, convertedCount, existingCount }: ClientsHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncAumOpen, setSyncAumOpen] = useState(false);
  const [aumFiles, setAumFiles] = useState<File[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const aumFileInput = useRef<HTMLInputElement>(null);

  const handleAumFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const csvFiles = Array.from(newFiles).filter(f => f.name.endsWith(".csv"));
    setAumFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...csvFiles.filter(f => !existing.has(f.name))];
    });
  };

  const handleAumSync = async () => {
    if (!aumFiles.length) { toast.error("Upload at least one CSV file"); return; }
    setSyncing(true);
    setSyncResult(null);
    const formData = new FormData();
    aumFiles.forEach(f => formData.append("files", f));
    try {
      const res = await fetch("/api/sync/aum", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Sync failed"); return; }
      setSyncResult(data);
      toast.success(data.message);
      router.refresh();
      setAumFiles([]);
    } catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  const activeType = searchParams.get("type") || "";
  const activeStatus = searchParams.get("status") || "";
  const activeCategory = searchParams.get("category") || "";

  const counts: Record<string, number> = {
    "": total,
    new: newCount,
    converted: convertedCount,
    existing: existingCount,
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/import/clients", { method: "POST", body: formData });
      const result = await res.json();
      if (result.created > 0) { toast.success(`Imported ${result.created} clients!`); router.refresh(); }
      else toast.error("No clients imported");
    } catch { toast.error("Import failed"); }
    setImporting(false);
    e.target.value = "";
  };

  const debouncedSearch = useDebounce(searchValue, 300);
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) { params.set("q", debouncedSearch); params.delete("page"); }
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedSearch]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportClients();
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = result.filename || "clients.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Clients exported!");
    } else toast.error("Export failed");
    setExporting(false);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground">{total.toLocaleString()} total clients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className={cn("cursor-pointer inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-muted-foreground hover:bg-accent transition-colors", importing && "opacity-50 pointer-events-none")}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import CSV
            <input type="file" accept=".csv" className="sr-only" onChange={handleImport} disabled={importing} />
          </label>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-brand-400 border-brand-500/30 hover:bg-brand-500/10" onClick={() => { setSyncAumOpen(true); setSyncResult(null); setAumFiles([]); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sync AUM
          </Button>
          <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5 shadow-glow-sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Client
          </Button>
        </div>
      </div>

      {/* Sync AUM Modal */}
      {syncAumOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSyncAumOpen(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-brand-400" /> Sync AUM from CAMS + KFintech
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Drop both CSV files to update all client AUMs</p>
              </div>
              <button onClick={() => setSyncAumOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleAumFiles(e.dataTransfer.files); }}
                onClick={() => aumFileInput.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                  dragOver ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/50 hover:bg-accent/30"
                )}
              >
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">Drop CSV files here</p>
                <p className="text-xs text-muted-foreground mt-1">CAMS AUM file + KFintech file (both at once)</p>
                <input ref={aumFileInput} type="file" accept=".csv" multiple className="sr-only" onChange={(e) => handleAumFiles(e.target.files)} />
              </div>

              {/* File list */}
              {aumFiles.length > 0 && (
                <div className="space-y-2">
                  {aumFiles.map(f => (
                    <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                      <FileText className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                      <button onClick={() => setAumFiles(prev => prev.filter(x => x.name !== f.name))} className="text-muted-foreground hover:text-danger transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sync button */}
              <button
                onClick={handleAumSync}
                disabled={syncing || !aumFiles.length}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-all"
              >
                {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</> : <><RefreshCw className="h-4 w-4" /> Sync AUM Now</>}
              </button>

              {/* Result */}
              {syncResult && (
                <div className={cn("rounded-xl p-4 space-y-2 border", syncResult.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-danger/5 border-danger/20")}>
                  <div className="flex items-center gap-2">
                    {syncResult.success ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-danger" />}
                    <p className="text-sm font-medium text-foreground">{syncResult.message}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-background rounded-lg p-2">
                      <p className="text-lg font-bold text-emerald-400">{syncResult.updated}</p>
                      <p className="text-2xs text-muted-foreground">Updated</p>
                    </div>
                    <div className="bg-background rounded-lg p-2">
                      <p className="text-lg font-bold text-muted-foreground">{syncResult.notFound}</p>
                      <p className="text-2xs text-muted-foreground">Not found</p>
                    </div>
                    <div className="bg-background rounded-lg p-2">
                      <p className="text-lg font-bold text-brand-400">
                        ₹{(syncResult.totalAUM / 10000000).toFixed(1)}Cr
                      </p>
                      <p className="text-2xs text-muted-foreground">Total AUM</p>
                    </div>
                  </div>
                  {syncResult.significantChanges?.length > 0 && (
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Changes:</p>
                      {syncResult.significantChanges.map((c: string, i: number) => (
                        <p key={i} className="text-xs text-foreground">{c}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Type tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button key={tab.key}
              onClick={() => handleFilterChange("type", tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                isActive
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-brand-400" : "")} />
              {tab.label}
              <span className={cn(
                "text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                isActive ? "bg-brand-500/15 text-brand-400" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name, email, PAN…" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeStatus ? `Status: ${activeStatus}` : "Status"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["", "ACTIVE", "INACTIVE", "PROSPECT", "DORMANT"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => handleFilterChange("status", s)} className={activeStatus === s ? "font-medium text-brand-400" : ""}>
                {s || "All statuses"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              {activeCategory ? `Category: ${activeCategory}` : "Category"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["", "RETAIL", "STANDARD", "PREMIUM", "HNI", "ULTRA_HNI"].map((c) => (
              <DropdownMenuItem key={c} onClick={() => handleFilterChange("category", c)} className={activeCategory === c ? "font-medium text-brand-400" : ""}>
                {c || "All categories"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              {searchParams.get("ageFilter") === "minor" ? "👶 Minors (under 18)" : searchParams.get("ageFilter") === "senior" ? "👴 Seniors (60+)" : "Age Filter"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by age</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleFilterChange("ageFilter", "")} className={!searchParams.get("ageFilter") ? "font-medium text-brand-400" : ""}>All ages</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("ageFilter", "minor")} className={searchParams.get("ageFilter") === "minor" ? "font-medium text-brand-400" : ""}>👶 Minors (under 18)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("ageFilter", "adult")} className={searchParams.get("ageFilter") === "adult" ? "font-medium text-brand-400" : ""}>👤 Adults (18-59)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange("ageFilter", "senior")} className={searchParams.get("ageFilter") === "senior" ? "font-medium text-brand-400" : ""}>👴 Seniors (60+)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ClientFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}
