"use client";
import { useEffect, useState } from "react";
import { IndianRupee, Loader2, RefreshCw, TrendingUp, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Folio {
  id: string;
  schemeName: string;
  fundHouse: string | null;
  folioNo: string | null;
  units: number | null;
  aum: number;
  source: string;
}

function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function FoliosSection({ clientId }: { clientId: string }) {
  const [folios, setFolios] = useState<Folio[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Folio[]>>({});
  const [totalAUM, setTotalAUM] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch(`/api/clients/folios?clientId=${clientId}`);
      const data = await res.json();
      setFolios(data.folios || []);
      setGrouped(data.grouped || {});
      setTotalAUM(data.totalAUM || 0);
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading MF portfolio...
    </div>
  );

  if (error) return (
    <div className="text-sm text-muted-foreground py-2">Could not load folio data.</div>
  );

  if (folios.length === 0) return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No MF folio data yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Sync CAMS + KFintech files from Clients page to populate</p>
    </div>
  );

  const fundHouses = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-brand-500/5 border border-brand-500/20 p-3 text-center">
          <p className="text-lg font-bold text-brand-400">{formatINR(totalAUM)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total MF AUM</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
          <p className="text-lg font-bold text-foreground">{folios.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Folios</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
          <p className="text-lg font-bold text-foreground">{fundHouses.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Fund Houses</p>
        </div>
      </div>

      {/* Fund house breakdown */}
      <div className="space-y-3">
        {fundHouses.map(fh => {
          const fhFolios = grouped[fh];
          const fhAUM = fhFolios.reduce((s, f) => s + Number(f.aum), 0);
          const pct = totalAUM > 0 ? (fhAUM / totalAUM) * 100 : 0;
          return (
            <div key={fh} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Fund house header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{fh}</span>
                  <span className="text-xs text-muted-foreground">({fhFolios.length} folio{fhFolios.length > 1 ? "s" : ""})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-brand-400">{formatINR(fhAUM)}</span>
                </div>
              </div>
              {/* Schemes */}
              <div className="divide-y divide-border">
                {fhFolios.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm text-foreground truncate">{f.schemeName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {f.folioNo && <span className="text-xs text-muted-foreground">Folio: {f.folioNo}</span>}
                        {f.units && <span className="text-xs text-muted-foreground">{Number(f.units).toFixed(3)} units</span>}
                        <span className={cn("text-2xs px-1.5 py-0.5 rounded-full font-medium",
                          f.source === "CAMS" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
                        )}>{f.source}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground flex-shrink-0">
                      {Number(f.aum) > 0 ? formatINR(Number(f.aum)) : <span className="text-muted-foreground text-xs">Redeemed</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-right flex items-center justify-end gap-1">
        <RefreshCw className="h-3 w-3" /> Data from last CAMS + KFintech sync
      </p>
    </div>
  );
}
