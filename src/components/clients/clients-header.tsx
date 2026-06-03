"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Users, Search, SlidersHorizontal, Plus,
  Download, Loader2, Upload, UserCheck, UserPlus, Star,
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
          <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5 shadow-glow-sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Client
          </Button>
        </div>
      </div>

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
      </div>

      <ClientFormModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}
