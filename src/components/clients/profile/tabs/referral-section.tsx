"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Share2,
  Search,
  Loader2,
  ArrowRight,
  IndianRupee,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency, getInitials, generateAvatarColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setReferredBy } from "@/actions/intelligence";
import { searchClients } from "@/actions/clients";
import Link from "next/link";

interface ReferralSectionProps {
  client: any;
}

export function ReferralSection({ client }: ReferralSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (search.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchClients(search);
      setResults(res.filter((r: any) => r.id !== client.id));
      setSearching(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const handleSetReferrer = async (referrerId: string) => {
    setSaving(true);
    const result = await setReferredBy(client.id, referrerId);
    if (result.success) {
      toast.success("Referrer linked!");
      setEditing(false);
      setSearch("");
      router.refresh();
    } else toast.error(result.error || "Failed");
    setSaving(false);
  };

  const referralAUM = client.referrals?.reduce((s: number, r: any) => s + Number(r.aum || 0), 0) || 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Share2 className="h-4 w-4 text-muted-foreground" /> Referral Network
        </h3>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-6 text-2xs text-brand-400 hover:text-brand-300"
            onClick={() => setEditing(true)}>
            {client.referredBy ? "Change" : "Set referrer"}
          </Button>
        )}
      </div>

      {/* Referred by */}
      <div className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Who referred {client.fullName.split(" ")[0]}?</p>
            <div className="relative">
              <Input
                placeholder="Search clients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm pr-8"
                autoFocus
              />
              {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {results.length > 0 && (
              <div className="rounded-lg border border-border bg-card divide-y divide-border shadow-lg max-h-40 overflow-y-auto">
                {results.map((r: any) => (
                  <button key={r.id} onClick={() => handleSetReferrer(r.id)}
                    disabled={saving}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left">
                    <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-bold flex-shrink-0", generateAvatarColor(r.id))}>
                      {getInitials(r.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.fullName}</p>
                      <p className="text-2xs text-muted-foreground">{r.category}</p>
                    </div>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <ArrowRight className="h-3.5 w-3.5 text-brand-400" />}
                  </button>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setEditing(false); setSearch(""); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-2xs text-muted-foreground mb-1.5">Referred by</p>
            {client.referredBy ? (
              <Link href={`/clients/${client.referredBy.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-brand-500/30 hover:bg-accent transition-colors">
                <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0", generateAvatarColor(client.referredBy.id))}>
                  {getInitials(client.referredBy.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{client.referredBy.fullName}</p>
                  <p className="text-2xs text-muted-foreground">{client.referredBy.category?.replace(/_/g, " ")}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
              </Link>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">No referrer linked</p>
                <button onClick={() => setEditing(true)} className="text-2xs text-brand-400 hover:text-brand-300 mt-0.5 transition-colors">
                  Link a referrer →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Referrals made */}
        {client.referrals?.length > 0 && (
          <div>
            <p className="text-2xs text-muted-foreground mb-1.5">
              Referred {client.referrals.length} client{client.referrals.length !== 1 ? "s" : ""}
              {referralAUM > 0 && <span className="text-emerald-400 ml-1">· {formatCurrency(referralAUM)} AUM</span>}
            </p>
            <div className="space-y-1">
              {client.referrals.slice(0, 3).map((r: any) => (
                <Link key={r.id} href={`/clients/${r.id}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors">
                  <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-bold flex-shrink-0", generateAvatarColor(r.id))}>
                    {getInitials(r.fullName)}
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">{r.fullName}</span>
                  {r.aum && <span className="text-2xs text-emerald-400">{formatCurrency(Number(r.aum))}</span>}
                </Link>
              ))}
              {client.referrals.length > 3 && (
                <p className="text-2xs text-muted-foreground pl-2.5">+{client.referrals.length - 3} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
