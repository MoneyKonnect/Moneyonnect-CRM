"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  TrendingUp,
  CheckSquare,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Plus,
  User,
  ArrowRight,
  Loader2,
  Cake,
} from "lucide-react";
import { cn, getInitials, generateAvatarColor } from "@/lib/utils";
import { searchClients } from "@/actions/clients";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Pipeline", href: "/leads", icon: TrendingUp },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Campaigns", href: "/campaigns", icon: MessageSquare },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Birthday Calendar", href: "/birthdays", icon: Cake },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ACTIONS = [
  { label: "Add new client", href: "/clients?new=1", icon: Plus },
  { label: "Add new lead", href: "/leads?new=1", icon: Plus },
  { label: "Create task", href: "/tasks?new=1", icon: Plus },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setClients([]); }
  }, [open]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setClients([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchClients(query);
      setClients(results);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const go = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const filteredNav = query
    ? NAV.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV;
  const filteredActions = query
    ? ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-[560px] mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {searching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, pages, actions…"
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-2xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Client search results */}
          {clients.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1.5 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Clients</div>
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => go(`/clients/${client.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold flex-shrink-0", generateAvatarColor(client.id))}>
                    {getInitials(client.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.fullName}</p>
                    <p className="text-2xs text-muted-foreground">{client.phone || client.email || client.category}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div className="py-2 border-t border-border/50">
              <div className="px-4 py-1.5 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</div>
              {filteredNav.slice(0, query ? filteredNav.length : 5).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.href} onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground">{item.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div className="py-2 border-t border-border/50">
              <div className="px-4 py-1.5 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</div>
              {filteredActions.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.href} onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-left">
                    <div className="w-5 h-5 rounded-md bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3 w-3 text-brand-400" />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {query.length >= 2 && clients.length === 0 && !searching && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No clients found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 bg-muted/30">
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <kbd className="font-mono bg-muted px-1 rounded border border-border">↵</kbd> select
          </div>
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <kbd className="font-mono bg-muted px-1 rounded border border-border">↑↓</kbd> navigate
          </div>
        </div>
      </div>
    </div>
  );
}
