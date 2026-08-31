"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldAlert, Search, Download, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, Loader2, ExternalLink, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { getComplianceEmails, updateComplianceEmailStatus, runComplianceSyncNow } from "@/actions/compliance";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEEDS_REVIEW: { label: "Needs Review", color: "text-amber-400", bg: "bg-amber-500/10" },
  CONFIRMED_COMPLAINT: { label: "Complaint", color: "text-red-400", bg: "bg-red-500/10" },
  CONFIRMED_QUERY: { label: "Query", color: "text-blue-400", bg: "bg-blue-500/10" },
  DISMISSED: { label: "Dismissed", color: "text-muted-foreground", bg: "bg-muted" },
};

export function ComplianceClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<any | null>(null);
  const [resolutionDraft, setResolutionDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getComplianceEmails({
      search: search || undefined,
      status: statusFilter || undefined,
    });
    setEmails(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openCount = emails.filter((e) => e.status === "OPEN").length;
  const resolvedCount = emails.filter((e) => e.status === "RESOLVED").length;
  const needsReviewCount = emails.filter((e) => e.category === "NEEDS_REVIEW").length;

  const handleResolve = async (email: any) => {
    setSaving(true);
    const result = await updateComplianceEmailStatus(email.id, {
      status: "RESOLVED",
      resolutionNotes: resolutionDraft,
    });
    if (result.success) {
      toast.success("Marked as resolved");
      setSelected(null);
      setResolutionDraft("");
      load();
    } else {
      toast.error("Failed to update");
    }
    setSaving(false);
  };

  const handleCategoryChange = async (email: any, category: string) => {
    // Dismissing means "not a real issue" — close it out entirely rather
    // than leaving it Open with no real action left to take on it.
    const payload: any = { category };
    if (category === "DISMISSED") payload.status = "RESOLVED";

    const result = await updateComplianceEmailStatus(email.id, payload);
    if (result.success) {
      toast.success(category === "DISMISSED" ? "Dismissed" : "Confirmed");
      load();
    } else {
      toast.error("Failed to update");
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await runComplianceSyncNow();
    if (result.success) {
      toast.success(`Synced — ${result.labelImported} from labels, ${result.keywordFlagged} new suggestions`);
      load();
    } else {
      toast.error(result.error || "Sync failed");
    }
    setSyncing(false);
  };

  const handleExport = () => {
    const rows = emails.map((e) => ({
      Subject: e.subject,
      From: e.fromName || e.fromAddress,
      Client: e.client?.fullName || "—",
      Category: CATEGORY_CONFIG[e.category]?.label || e.category,
      Status: e.status,
      "Received At": new Date(e.receivedAt).toLocaleDateString("en-IN"),
      "Resolved At": e.resolvedAt ? new Date(e.resolvedAt).toLocaleDateString("en-IN") : "",
      "Resolution Notes": e.resolutionNotes || "",
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(","),
      ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Compliance Register</h1>
            <p className="text-sm text-muted-foreground">
              Client complaints and queries synced from Gmail
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSyncNow} disabled={syncing} variant="outline" className="gap-1.5">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button onClick={handleExport} disabled={emails.length === 0} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="text-2xl font-bold text-amber-400">{openCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-2xl font-bold text-red-400">{needsReviewCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subject, sender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No compliance emails found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map((email) => {
              const cfg = CATEGORY_CONFIG[email.category] || CATEGORY_CONFIG.NEEDS_REVIEW;
              return (
                <div key={email.id} className="p-4 hover:bg-accent/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-2xs px-2 py-0.5 rounded-full font-semibold", cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        {email.status === "RESOLVED" ? (
                          <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                          </span>
                        ) : (
                          <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> Open
                          </span>
                        )}
                        {email.isAutoSuggested && (
                          <span className="text-2xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                            Auto-suggested
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{email.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {email.fromName || email.fromAddress}
                        {email.client && (
                          <a href={`/clients/${email.client.id}`} className="ml-2 text-brand-400 hover:underline inline-flex items-center gap-0.5">
                            {email.client.fullName} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {" · "}{formatDate(email.receivedAt, "relative")}
                      </p>
                      {email.resolutionNotes && (
                        <p className="text-xs text-emerald-400/80 mt-1.5 italic">
                          Resolution: {email.resolutionNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {email.category === "NEEDS_REVIEW" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCategoryChange(email, "CONFIRMED_COMPLAINT")}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleCategoryChange(email, "DISMISSED")}>
                            Dismiss
                          </Button>
                        </>
                      )}
                      {email.status === "OPEN" && email.category !== "NEEDS_REVIEW" && email.category !== "DISMISSED" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-brand-500 hover:bg-brand-600 text-white"
                          onClick={() => { setSelected(email); setResolutionDraft(""); }}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">Mark as Resolved</p>
            <p className="text-xs text-muted-foreground">{selected.subject}</p>
            <textarea
              value={resolutionDraft}
              onChange={(e) => setResolutionDraft(e.target.value)}
              placeholder="How was this resolved?"
              className="w-full bg-background border border-border rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white"
                onClick={() => handleResolve(selected)}
                disabled={saving || !resolutionDraft.trim()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
