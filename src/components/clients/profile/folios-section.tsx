"use client";
import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";

interface Folio {
  id: string;
  schemeName: string;
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

function groupByScheme(folios: Folio[]) {
  const map: Record<string, { schemeName: string; totalAUM: number; folios: Folio[] }> = {};
  for (const f of folios) {
    const key = f.schemeName.trim();
    if (!map[key]) map[key] = { schemeName: key, totalAUM: 0, folios: [] };
    map[key].totalAUM += Number(f.aum);
    map[key].folios.push(f);
  }
  return Object.values(map).sort((a, b) => b.totalAUM - a.totalAUM);
}

export function FoliosSection({ clientId }: { clientId: string }) {
  const [folios, setFolios] = useState<Folio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/clients/folios?clientId=${clientId}`)
      .then(r => r.json())
      .then(d => {
        const active = (d.folios || []).filter((f: Folio) => Number(f.aum) > 0);
        setFolios(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading portfolio...
    </div>
  );

  if (folios.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingUp className="h-7 w-7 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">No active MF investments</p>
      <p className="text-xs text-muted-foreground/50 mt-0.5">Sync CAMS + KFintech to populate</p>
    </div>
  );

  const schemes = groupByScheme(folios);
  const totalAUM = schemes.reduce((s, sc) => s + sc.totalAUM, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-2 px-1 mb-2">
        <span className="text-xs text-muted-foreground">{schemes.length} schemes · {folios.length} folios</span>
        <span className="text-sm font-bold text-brand-400">{formatINR(totalAUM)}</span>
      </div>
      {schemes.map(sc => {
        const hasMultiple = sc.folios.length > 1;
        const isOpen = expanded[sc.schemeName];
        return (
          <div key={sc.schemeName}>
            <div
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => hasMultiple && setExpanded(e => ({ ...e, [sc.schemeName]: !e[sc.schemeName] }))}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {hasMultiple ? (
                  isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : <span className="w-3.5 flex-shrink-0" />}
                <span className="text-sm text-foreground truncate">{sc.schemeName}</span>
              </div>
              <span className="text-sm font-semibold text-foreground flex-shrink-0 ml-3">{formatINR(sc.totalAUM)}</span>
            </div>
            {hasMultiple && isOpen && (
              <div className="ml-8 mb-1 space-y-0.5">
                {sc.folios.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
                    <span className="text-xs text-muted-foreground">Folio {f.folioNo || "—"}{f.units ? ` · ${Number(f.units).toFixed(3)} units` : ""}</span>
                    <span className="text-xs font-medium text-foreground">{formatINR(Number(f.aum))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
