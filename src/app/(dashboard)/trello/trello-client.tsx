"use client";

import { useEffect, useState, useRef } from "react";
import { ExternalLink, RefreshCw, Plus, X, Calendar, Tag, Trash2, Check, ChevronDown, GripVertical, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const KEY = "b85ba5057f173e2b7363a717e2c48211";
const TOKEN = "ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE";
const BOARD_ID = "KdtxcW8A";
const BOARD_URL = "https://trello.com/b/KdtxcW8A/moneykonnect-operations-board";
const BASE = "https://api.trello.com/1";
const AUTH = `key=${KEY}&token=${TOKEN}`;

interface Label { id: string; color: string; name: string; }
interface Member { id: string; fullName: string; initials: string; }
interface Card {
  id: string; name: string; desc: string; due: string | null;
  dueComplete: boolean; labels: Label[]; members: Member[];
  idList: string; pos: number;
}
interface TrelloList { id: string; name: string; cards: Card[]; }

const LABEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  red:    { bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-500" },
  orange: { bg: "bg-orange-500/15",  text: "text-orange-400",  dot: "bg-orange-500" },
  yellow: { bg: "bg-yellow-500/15",  text: "text-yellow-400",  dot: "bg-yellow-500" },
  green:  { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-500" },
  blue:   { bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-500" },
  purple: { bg: "bg-purple-500/15",  text: "text-purple-400",  dot: "bg-purple-500" },
  pink:   { bg: "bg-pink-500/15",    text: "text-pink-400",    dot: "bg-pink-500" },
  sky:    { bg: "bg-sky-500/15",     text: "text-sky-400",     dot: "bg-sky-500" },
  lime:   { bg: "bg-lime-500/15",    text: "text-lime-400",    dot: "bg-lime-500" },
  black:  { bg: "bg-zinc-500/15",    text: "text-zinc-400",    dot: "bg-zinc-500" },
};

function trelloFetch(path: string, options?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  return fetch(`${BASE}${path}${sep}${AUTH}`, options);
}

export default function TrelloClient() {
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingTo, setMovingTo] = useState("");

  // Add card
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  // Drag state
  const dragCard = useRef<{ cardId: string; fromListId: string } | null>(null);

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listsRes, cardsRes, labelsRes] = await Promise.all([
        trelloFetch(`/boards/${BOARD_ID}/lists?fields=id,name`),
        trelloFetch(`/boards/${BOARD_ID}/cards?fields=id,name,desc,due,dueComplete,labels,idList,pos&members=true&member_fields=fullName,initials`),
        trelloFetch(`/boards/${BOARD_ID}/labels?fields=id,name,color&limit=50`),
      ]);
      if (!listsRes.ok) throw new Error("Failed");
      const [listsData, cardsData, labelsData] = await Promise.all([listsRes.json(), cardsRes.json(), labelsRes.json()]);
      setBoardLabels(labelsData);
      setLists(listsData.map((l: any) => ({
        ...l,
        cards: cardsData.filter((c: any) => c.idList === l.id).sort((a: any, b: any) => a.pos - b.pos),
      })));
      setLastUpdated(new Date());
    } catch {
      setError("Could not load Trello board.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, []);

  // Open card modal
  const openCard = (card: Card) => {
    setSelectedCard(card);
    setEditName(card.name);
    setEditDesc(card.desc || "");
    setEditDue(card.due ? card.due.slice(0, 10) : "");
    setMovingTo("");
  };

  // Save card changes
  const saveCard = async () => {
    if (!selectedCard) return;
    setSaving(true);
    try {
      const body: any = { name: editName, desc: editDesc };
      if (editDue) body.due = new Date(editDue).toISOString();
      else body.due = null;
      const res = await trelloFetch(`/cards/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Card updated");
      setSelectedCard(null);
      fetchBoard();
    } catch {
      toast.error("Failed to update card");
    } finally {
      setSaving(false);
    }
  };

  // Toggle due complete
  const toggleDueComplete = async (card: Card) => {
    try {
      await trelloFetch(`/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueComplete: !card.dueComplete }),
      });
      fetchBoard();
    } catch { toast.error("Failed"); }
  };

  // Delete card
  const deleteCard = async () => {
    if (!selectedCard) return;
    if (!confirm(`Delete "${selectedCard.name}"?`)) return;
    try {
      await trelloFetch(`/cards/${selectedCard.id}`, { method: "DELETE" });
      toast.success("Card deleted");
      setSelectedCard(null);
      fetchBoard();
    } catch { toast.error("Failed to delete"); }
  };

  // Move card to list
  const moveCard = async (cardId: string, toListId: string) => {
    try {
      await trelloFetch(`/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idList: toListId, pos: "bottom" }),
      });
      toast.success("Card moved");
      if (selectedCard) setSelectedCard(null);
      fetchBoard();
    } catch { toast.error("Failed to move card"); }
  };

  // Add card
  const addCard = async (listId: string) => {
    if (!newCardName.trim()) return;
    setAddingCard(true);
    try {
      const res = await trelloFetch(`/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCardName.trim(), idList: listId, pos: "bottom" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Card created");
      setNewCardName("");
      setAddingToList(null);
      fetchBoard();
    } catch { toast.error("Failed to create card"); } finally { setAddingCard(false); }
  };

  // Drag handlers
  const onDragStart = (cardId: string, fromListId: string) => {
    dragCard.current = { cardId, fromListId };
  };
  const onDrop = (toListId: string) => {
    if (!dragCard.current || dragCard.current.fromListId === toListId) return;
    moveCard(dragCard.current.cardId, toListId);
    dragCard.current = null;
  };

  const formatDue = (due: string | null, complete: boolean) => {
    if (!due) return null;
    const d = new Date(due);
    const now = new Date();
    return {
      text: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      overdue: d < now && !complete,
      complete,
    };
  };

  const totalCards = lists.reduce((a, l) => a + l.cards.length, 0);

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading Trello board...</span>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-danger/20 bg-danger/5">
        <AlertCircle className="h-5 w-5 text-danger" />
        <div>
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchBoard} className="text-xs text-brand-400 hover:underline mt-1">Try again</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
            </svg>
            Operations Board
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCards} cards · {lists.length} lists{lastUpdated && ` · ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBoard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <a href={BOARD_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 transition-all">
            <ExternalLink className="h-3.5 w-3.5" /> Open Trello
          </a>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
        {lists.map((list) => (
          <div key={list.id}
            className="flex-shrink-0 w-68 flex flex-col"
            style={{ width: 272 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(list.id)}
          >
            <div className="bg-card border border-border rounded-xl flex flex-col h-full max-h-[calc(100vh-220px)]">
              {/* List header */}
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold text-foreground">{list.name}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{list.cards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {list.cards.map((card) => {
                  const due = formatDue(card.due, card.dueComplete);
                  return (
                    <div key={card.id}
                      draggable
                      onDragStart={() => onDragStart(card.id, list.id)}
                      onClick={() => openCard(card)}
                      className="p-3 rounded-lg bg-background border border-border hover:border-brand-500/40 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      {/* Drag handle + labels */}
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          {card.labels?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {card.labels.map((l, i) => {
                                const c = LABEL_COLORS[l.color] || LABEL_COLORS.black;
                                return (
                                  <span key={i} className={`flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                    {l.name || l.color}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <p className="text-sm text-foreground leading-snug group-hover:text-brand-400 transition-colors">{card.name}</p>
                          {(due || card.members?.length > 0) && (
                            <div className="flex items-center justify-between mt-2">
                              {due ? (
                                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${due.complete ? "bg-emerald-500/15 text-emerald-400" : due.overdue ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>
                                  <Calendar className="h-2.5 w-2.5" />
                                  {due.complete ? "✓ " : due.overdue ? "⚠ " : ""}{due.text}
                                </span>
                              ) : <span />}
                              {card.members?.length > 0 && (
                                <div className="flex -space-x-1">
                                  {card.members.slice(0, 3).map((m, i) => (
                                    <div key={i} title={m.fullName}
                                      className="w-5 h-5 rounded-full bg-brand-500/20 border border-background flex items-center justify-center text-2xs font-bold text-brand-400">
                                      {m.initials?.slice(0, 2)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add card */}
              <div className="p-2 border-t border-border flex-shrink-0">
                {addingToList === list.id ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(list.id); } if (e.key === "Escape") { setAddingToList(null); setNewCardName(""); } }}
                      placeholder="Card title..."
                      rows={2}
                      className="w-full text-sm bg-background border border-border rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => addCard(list.id)} disabled={addingCard || !newCardName.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1">
                        {addingCard ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Add
                      </button>
                      <button onClick={() => { setAddingToList(null); setNewCardName(""); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingToList(list.id)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                    <Plus className="h-3.5 w-3.5" /> Add card
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCard(null); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-base">Edit Card</h2>
              <div className="flex items-center gap-2">
                <button onClick={deleteCard} className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedCard(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                  placeholder="Add a description..."
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Due date + complete */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</label>
                  <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"
                  />
                </div>
                {selectedCard.due && (
                  <button onClick={() => toggleDueComplete(selectedCard)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedCard.dueComplete ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                    <Check className="h-3.5 w-3.5" />
                    {selectedCard.dueComplete ? "Completed" : "Mark done"}
                  </button>
                )}
              </div>

              {/* Labels */}
              {selectedCard.labels?.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><Tag className="h-3 w-3" /> Labels</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCard.labels.map((l, i) => {
                      const c = LABEL_COLORS[l.color] || LABEL_COLORS.black;
                      return (
                        <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
                          {l.name || l.color}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Move to list */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1"><ChevronDown className="h-3 w-3" /> Move to List</label>
                <select value={movingTo || selectedCard.idList}
                  onChange={(e) => { setMovingTo(e.target.value); moveCard(selectedCard.id, e.target.value); }}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}{l.id === selectedCard.idList ? " (current)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between">
              <a href={`https://trello.com/c/${selectedCard.id}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-brand-400 flex items-center gap-1 transition-colors">
                <ExternalLink className="h-3 w-3" /> Open in Trello
              </a>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedCard(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all">Cancel</button>
                <button onClick={saveCard} disabled={saving || !editName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
