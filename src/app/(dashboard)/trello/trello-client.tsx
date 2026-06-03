"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Plus, AlertCircle } from "lucide-react";

const TRELLO_KEY = "b85ba5057f173e2b7363a717e2c48211";
const TRELLO_TOKEN = "ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE";
const BOARD_ID = "KdtxcW8A";
const BOARD_URL = "https://trello.com/b/KdtxcW8A/moneykonnect-operations-board";

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete: boolean;
  labels: { color: string; name: string }[];
  members: { fullName: string; initials: string }[];
  idList: string;
}

interface TrelloList {
  id: string;
  name: string;
  cards: TrelloCard[];
}

const LABEL_COLORS: Record<string, string> = {
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  sky: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  lime: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  black: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function TrelloClient() {
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = `https://api.trello.com/1`;
      const auth = `key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

      const [listsRes, cardsRes] = await Promise.all([
        fetch(`${base}/boards/${BOARD_ID}/lists?${auth}&fields=id,name`),
        fetch(`${base}/boards/${BOARD_ID}/cards?${auth}&fields=id,name,desc,due,dueComplete,labels,idList&members=true&member_fields=fullName,initials`),
      ]);

      if (!listsRes.ok || !cardsRes.ok) throw new Error("Failed to fetch board");

      const [listsData, cardsData] = await Promise.all([listsRes.json(), cardsRes.json()]);

      const combined: TrelloList[] = listsData.map((list: any) => ({
        ...list,
        cards: cardsData.filter((card: any) => card.idList === list.id),
      }));

      setLists(combined);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Could not load Trello board. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, []);

  const formatDue = (due: string | null, complete: boolean) => {
    if (!due) return null;
    const date = new Date(due);
    const now = new Date();
    const isOverdue = date < now && !complete;
    const formatted = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return { formatted, isOverdue, complete };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Operations Board</h1>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading board...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold text-foreground">Operations Board</h1>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger/20 bg-danger/5">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground font-medium">{error}</p>
            <button onClick={fetchBoard} className="text-xs text-brand-400 hover:underline mt-1">Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const totalCards = lists.reduce((a, l) => a + l.cards.length, 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Operations Board</h1>
            <p className="text-xs text-muted-foreground">{totalCards} cards across {lists.length} lists{lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBoard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <a href={BOARD_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 transition-all">
            <ExternalLink className="h-3.5 w-3.5" /> Open in Trello
          </a>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {lists.map((list) => (
          <div key={list.id} className="flex-shrink-0 w-72">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* List header */}
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{list.name}</h3>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{list.cards.length}</span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {list.cards.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No cards</p>
                )}
                {list.cards.map((card) => {
                  const due = formatDue(card.due, card.dueComplete);
                  return (
                    <a key={card.id}
                      href={`https://trello.com/c/${card.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-background border border-border hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group"
                    >
                      {/* Labels */}
                      {card.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {card.labels.map((label, i) => (
                            <span key={i} className={`text-2xs px-1.5 py-0.5 rounded-full border font-medium ${LABEL_COLORS[label.color] || "bg-muted text-muted-foreground border-border"}`}>
                              {label.name || label.color}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <p className="text-sm text-foreground group-hover:text-brand-400 transition-colors leading-snug">{card.name}</p>

                      {/* Footer */}
                      {(due || card.members?.length > 0) && (
                        <div className="flex items-center justify-between mt-2">
                          {due ? (
                            <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${due.complete ? "bg-emerald-500/15 text-emerald-400" : due.isOverdue ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>
                              {due.complete ? "✓ " : due.isOverdue ? "⚠ " : ""}{due.formatted}
                            </span>
                          ) : <span />}
                          {card.members?.length > 0 && (
                            <div className="flex -space-x-1">
                              {card.members.slice(0, 3).map((m, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-brand-500/20 border border-background flex items-center justify-center text-2xs font-bold text-brand-400" title={m.fullName}>
                                  {m.initials?.slice(0, 2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </a>
                  );
                })}

                {/* Add card link */}
                <a href={BOARD_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-full">
                  <Plus className="h-3.5 w-3.5" /> Add card
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
