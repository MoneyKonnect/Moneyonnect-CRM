"use client";
import { useEffect, useState, useRef } from "react";
import {
  ExternalLink, RefreshCw, Plus, X, Calendar, Trash2,
  Loader2, AlertCircle, CheckSquare, MessageSquare,
  Paperclip, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const KEY = "b85ba5057f173e2b7363a717e2c48211";
const TOKEN = "ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE";
const BOARD_ID = "sxYFo8yq";
const BOARD_URL = "https://trello.com/b/sxYFo8yq";
const BASE = "https://api.trello.com/1";
const Q = `key=${KEY}&token=${TOKEN}`;

const api = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}${Q}`, opts);

const COLORS: Record<string, { bg: string; text: string }> = {
  red:    { bg: "bg-red-500/20",     text: "text-red-400" },
  orange: { bg: "bg-orange-500/20",  text: "text-orange-400" },
  yellow: { bg: "bg-yellow-500/20",  text: "text-yellow-400" },
  green:  { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  blue:   { bg: "bg-blue-500/20",    text: "text-blue-400" },
  purple: { bg: "bg-purple-500/20",  text: "text-purple-400" },
  pink:   { bg: "bg-pink-500/20",    text: "text-pink-400" },
  sky:    { bg: "bg-sky-500/20",     text: "text-sky-400" },
  lime:   { bg: "bg-lime-500/20",    text: "text-lime-400" },
  black:  { bg: "bg-zinc-500/20",    text: "text-zinc-400" },
};

interface Card {
  id: string; name: string; desc: string; due: string | null;
  dueComplete: boolean; labels: any[]; members: any[];
  idList: string; pos: number;
  badges?: { comments: number; attachments: number; checkItems: number; checkItemsChecked: number };
}
interface TList { id: string; name: string; cards: Card[]; }
interface CheckItem { id: string; name: string; state: string; }
interface Checklist { id: string; name: string; checkItems: CheckItem[]; }
interface Comment { id: string; data: { text: string }; memberCreator: { fullName: string; initials: string }; date: string; }

export default function LeadsBoardClient() {
  const [lists, setLists] = useState<TList[]>([]);
  const [boardLabels, setBoardLabels] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingCheckItem, setAddingCheckItem] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCard, setNewCard] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const dragRef = useRef<{ cardId: string; fromList: string } | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [lr, cr, labr, memr] = await Promise.all([
        api(`/boards/${BOARD_ID}/lists?fields=id,name`),
        api(`/boards/${BOARD_ID}/cards?fields=id,name,desc,due,dueComplete,labels,idList,pos,badges&members=true&member_fields=fullName,initials`),
        api(`/boards/${BOARD_ID}/labels?fields=id,name,color`),
        api(`/boards/${BOARD_ID}/members?fields=id,fullName,initials`),
      ]);
      if (!lr.ok) throw new Error();
      const [ld, cd, labd, memd] = await Promise.all([lr.json(), cr.json(), labr.json(), memr.json()]);
      setLists(ld.map((l: any) => ({ ...l, cards: cd.filter((c: any) => c.idList === l.id).sort((a: any, b: any) => a.pos - b.pos) })));
      setBoardLabels(labd); setBoardMembers(memd);
    } catch { setError("Could not load Leads Board."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCard = async (card: Card) => {
    setSelected(card); setEditName(card.name); setEditDesc(card.desc || ""); setEditDue(card.due ? card.due.slice(0, 10) : "");
    setChecklists([]); setComments([]); setLoadingDetails(true);
    try {
      const [clr, cmr] = await Promise.all([api(`/cards/${card.id}/checklists`), api(`/cards/${card.id}/actions?filter=commentCard`)]);
      const [cld, cmd] = await Promise.all([clr.json(), cmr.json()]);
      setChecklists(cld); setComments(cmd);
    } catch {} finally { setLoadingDetails(false); }
  };

  const saveCard = async () => {
    if (!selected) return; setSaving(true);
    try {
      const r = await api(`/cards/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, desc: editDesc, due: editDue ? new Date(editDue).toISOString() : null }) });
      if (!r.ok) throw new Error();
      toast.success("Saved"); setSelected(null); load();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const deleteCard = async () => {
    if (!selected || !confirm(`Delete "${selected.name}"?`)) return;
    try { await api(`/cards/${selected.id}`, { method: "DELETE" }); toast.success("Deleted"); setSelected(null); load(); }
    catch { toast.error("Failed"); }
  };

  const moveCard = async (cardId: string, toList: string) => {
    try { await api(`/cards/${cardId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idList: toList, pos: "bottom" }) }); load(); }
    catch { toast.error("Failed"); }
  };

  const addCard = async (listId: string) => {
    if (!newCard.trim()) return; setAddingCard(true);
    try {
      const r = await api(`/cards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCard.trim(), idList: listId, pos: "bottom" }) });
      if (!r.ok) throw new Error();
      toast.success("Added"); setNewCard(""); setAddingTo(null); load();
    } catch { toast.error("Failed"); } finally { setAddingCard(false); }
  };

  const createList = async () => {
    if (!newListName.trim()) return; setCreatingList(true);
    try {
      const r = await api(`/lists`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newListName.trim(), idBoard: BOARD_ID, pos: "bottom" }) });
      if (!r.ok) throw new Error();
      toast.success("List created"); setNewListName(""); setAddingList(false); load();
    } catch { toast.error("Failed"); } finally { setCreatingList(false); }
  };

  const addComment = async () => {
    if (!selected || !newComment.trim()) return; setAddingComment(true);
    try {
      const r = await api(`/cards/${selected.id}/actions/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: newComment.trim() }) });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setComments(prev => [data, ...prev]); setNewComment("");
    } catch { toast.error("Failed"); } finally { setAddingComment(false); }
  };

  const toggleCheckItem = async (checklistId: string, itemId: string, current: string) => {
    if (!selected) return;
    const newState = current === "complete" ? "incomplete" : "complete";
    try {
      await api(`/cards/${selected.id}/checklist/${checklistId}/checkItem/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: newState }) });
      setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, checkItems: cl.checkItems.map(ci => ci.id === itemId ? { ...ci, state: newState } : ci) } : cl));
    } catch { toast.error("Failed"); }
  };

  const addCheckItem = async (checklistId: string) => {
    if (!newChecklistItem.trim() || !selected) return;
    try {
      const r = await api(`/checklists/${checklistId}/checkItems`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newChecklistItem.trim() }) });
      const data = await r.json();
      setChecklists(prev => prev.map(cl => cl.id === checklistId ? { ...cl, checkItems: [...cl.checkItems, data] } : cl));
      setNewChecklistItem(""); setAddingCheckItem(null);
    } catch { toast.error("Failed"); }
  };

  const toggleLabel = async (labelId: string) => {
    if (!selected) return;
    const hasLabel = selected.labels?.some(l => l.id === labelId);
    try {
      if (hasLabel) { await api(`/cards/${selected.id}/idLabels/${labelId}`, { method: "DELETE" }); setSelected(s => s ? { ...s, labels: s.labels.filter(l => l.id !== labelId) } : s); }
      else { await api(`/cards/${selected.id}/idLabels`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: labelId }) }); const label = boardLabels.find(l => l.id === labelId); setSelected(s => s ? { ...s, labels: [...(s.labels || []), label] } : s); }
    } catch { toast.error("Failed"); }
  };

  const toggleMember = async (memberId: string) => {
    if (!selected) return;
    const hasMember = selected.members?.some(m => m.id === memberId);
    try {
      if (hasMember) { await api(`/cards/${selected.id}/idMembers/${memberId}`, { method: "DELETE" }); setSelected(s => s ? { ...s, members: s.members.filter(m => m.id !== memberId) } : s); }
      else { await api(`/cards/${selected.id}/idMembers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: memberId }) }); const member = boardMembers.find(m => m.id === memberId); setSelected(s => s ? { ...s, members: [...(s.members || []), member] } : s); }
    } catch { toast.error("Failed"); }
  };

  const total = lists.reduce((a, l) => a + l.cards.length, 0);

  if (loading) return <div className="p-6 flex items-center gap-3 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading Leads Board...</span></div>;
  if (error) return <div className="p-6"><div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5"><AlertCircle className="h-5 w-5 text-red-400" /><div><p className="text-sm">{error}</p><button onClick={load} className="text-xs text-brand-400 hover:underline mt-1">Retry</button></div></div></div>;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div><h1 className="text-xl font-semibold">Leads Board</h1><p className="text-xs text-muted-foreground mt-0.5">{total} cards · {lists.length} lists</p></div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          <a href={BOARD_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 transition-all"><ExternalLink className="h-3.5 w-3.5" /> Open Trello</a>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {lists.map(list => (
          <div key={list.id} className="flex-shrink-0 flex flex-col" style={{ width: 272 }} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragRef.current) { moveCard(dragRef.current.cardId, list.id); dragRef.current = null; } }}>
            <div className="bg-card border border-border rounded-xl flex flex-col max-h-[calc(100vh-220px)]">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold">{list.name}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{list.cards.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {list.cards.map(card => {
                  const due = card.due ? new Date(card.due) : null;
                  const overdue = due && due < new Date() && !card.dueComplete;
                  return (
                    <div key={card.id} draggable onDragStart={() => { dragRef.current = { cardId: card.id, fromList: list.id }; }} onClick={() => openCard(card)} className="p-3 rounded-lg bg-background border border-border hover:border-brand-500/40 cursor-pointer group transition-all">
                      {card.labels?.length > 0 && <div className="flex flex-wrap gap-1 mb-1.5">{card.labels.map((l, i) => { const c = COLORS[l.color] || COLORS.black; return <span key={i} className={`text-2xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{l.name || l.color}</span>; })}</div>}
                      <p className="text-sm group-hover:text-brand-400 transition-colors leading-snug">{card.name}</p>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {due && <span className={cn("text-2xs flex items-center gap-1 px-1.5 py-0.5 rounded-full", card.dueComplete ? "bg-emerald-500/15 text-emerald-400" : overdue ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground")}><Calendar className="h-2.5 w-2.5" />{due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                          {(card.badges?.comments ?? 0) > 0 && <span className="text-2xs text-muted-foreground flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{card.badges!.comments}</span>}
                          {(card.badges?.checkItems ?? 0) > 0 && <span className="text-2xs text-muted-foreground flex items-center gap-0.5"><CheckSquare className="h-2.5 w-2.5" />{card.badges!.checkItemsChecked}/{card.badges!.checkItems}</span>}
                        </div>
                        {card.members?.length > 0 && <div className="flex -space-x-1">{card.members.slice(0, 3).map((m, i) => <div key={i} title={m.fullName} className="w-5 h-5 rounded-full bg-brand-500/20 border border-background flex items-center justify-center text-2xs font-bold text-brand-400">{m.initials?.slice(0, 2)}</div>)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-2 border-t border-border flex-shrink-0">
                {addingTo === list.id ? (
                  <div className="space-y-2">
                    <textarea autoFocus value={newCard} onChange={e => setNewCard(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(list.id); } if (e.key === "Escape") { setAddingTo(null); setNewCard(""); } }} placeholder="Card title..." rows={2} className="w-full text-sm bg-background border border-border rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
                    <div className="flex gap-1.5">
                      <button onClick={() => addCard(list.id)} disabled={addingCard || !newCard.trim()} className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1">{addingCard ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Add</button>
                      <button onClick={() => { setAddingTo(null); setNewCard(""); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ) : <button onClick={() => setAddingTo(list.id)} className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all"><Plus className="h-3.5 w-3.5" /> Add card</button>}
              </div>
            </div>
          </div>
        ))}

        {/* Add another list */}
        <div className="flex-shrink-0" style={{ width: 272 }}>
          {addingList ? (
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
              <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createList(); if (e.key === "Escape") { setAddingList(false); setNewListName(""); } }} placeholder="List name..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
              <div className="flex gap-1.5">
                <button onClick={createList} disabled={creatingList || !newListName.trim()} className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1">{creatingList ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Add List</button>
                <button onClick={() => { setAddingList(false); setNewListName(""); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingList(true)} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-card hover:text-foreground border border-dashed border-border hover:border-brand-500/40 transition-all">
              <Plus className="h-4 w-4" /> Add another list
            </button>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl mb-8">
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex-1 pr-4">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-base font-semibold bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 -mx-1" />
                <p className="text-xs text-muted-foreground mt-1">in list <span className="text-foreground">{lists.find(l => l.id === selected.idList)?.name}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={deleteCard} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-3 gap-5">
              <div className="col-span-2 space-y-5">
                {selected.labels?.length > 0 && <div className="flex flex-wrap gap-1.5">{selected.labels.map((l, i) => { const c = COLORS[l.color] || COLORS.black; return <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>{l.name || l.color}</span>; })}</div>}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} placeholder="Add a description..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
                </div>
                {loadingDetails ? <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</div> : checklists.length > 0 && (
                  <div className="space-y-4">
                    {checklists.map(cl => {
                      const done = cl.checkItems.filter(ci => ci.state === "complete").length;
                      const pct = cl.checkItems.length > 0 ? Math.round((done / cl.checkItems.length) * 100) : 0;
                      return (
                        <div key={cl.id}>
                          <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-medium flex items-center gap-1.5"><CheckSquare className="h-4 w-4 text-brand-400" />{cl.name}</h4><span className="text-xs text-muted-foreground">{pct}%</span></div>
                          <div className="h-1.5 bg-muted rounded-full mb-3"><div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                          <div className="space-y-1.5">
                            {cl.checkItems.map(ci => (
                              <button key={ci.id} onClick={() => toggleCheckItem(cl.id, ci.id, ci.state)} className="flex items-center gap-2.5 w-full text-left group">
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all", ci.state === "complete" ? "bg-brand-500 border-brand-500" : "border-border group-hover:border-brand-500")}>{ci.state === "complete" && <Check className="h-2.5 w-2.5 text-white" />}</div>
                                <span className={cn("text-sm", ci.state === "complete" ? "line-through text-muted-foreground" : "text-foreground")}>{ci.name}</span>
                              </button>
                            ))}
                            {addingCheckItem === cl.id ? (
                              <div className="flex gap-2 mt-2">
                                <input autoFocus value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCheckItem(cl.id); if (e.key === "Escape") { setAddingCheckItem(null); setNewChecklistItem(""); } }} placeholder="New item..." className="flex-1 text-sm bg-background border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
                                <button onClick={() => addCheckItem(cl.id)} className="px-2.5 py-1.5 rounded-lg text-xs bg-brand-500 text-white">Add</button>
                                <button onClick={() => { setAddingCheckItem(null); setNewChecklistItem(""); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : <button onClick={() => setAddingCheckItem(cl.id)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"><Plus className="h-3 w-3" /> Add item</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-brand-400" />Comments</h4>
                  <div className="space-y-2 mb-3">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} placeholder="Write a comment..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
                    <button onClick={addComment} disabled={addingComment || !newComment.trim()} className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1">{addingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save</button>
                  </div>
                  {comments.length > 0 && <div className="space-y-3">{comments.map(c => <div key={c.id} className="flex gap-2.5"><div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">{c.memberCreator?.initials?.slice(0, 2)}</div><div className="flex-1 bg-muted/50 rounded-lg px-3 py-2"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium">{c.memberCreator?.fullName}</span><span className="text-2xs text-muted-foreground">{new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><p className="text-sm">{c.data?.text}</p></div></div>)}</div>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</label>
                  <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Move to List</label>
                  <select value={selected.idList} onChange={e => { moveCard(selected.id, e.target.value); setSelected(null); }} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">{lists.map(l => <option key={l.id} value={l.id}>{l.name}{l.id === selected.idList ? " ✓" : ""}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Labels</label>
                  <div className="space-y-1.5">{boardLabels.filter(l => l.color).map(l => { const c = COLORS[l.color] || COLORS.black; const active = selected.labels?.some(sl => sl.id === l.id); return <button key={l.id} onClick={() => toggleLabel(l.id)} className={cn("flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-all", active ? `${c.bg} ${c.text} font-medium` : "text-muted-foreground hover:bg-accent")}><span className={cn("w-3 h-3 rounded-sm", c.bg)} />{l.name || l.color}{active && <Check className="h-3 w-3 ml-auto" />}</button>; })}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Members</label>
                  <div className="space-y-1.5">{boardMembers.map(m => { const active = selected.members?.some(sm => sm.id === m.id); return <button key={m.id} onClick={() => toggleMember(m.id)} className={cn("flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-all", active ? "bg-brand-500/10 text-brand-400 font-medium" : "text-muted-foreground hover:bg-accent")}><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-2xs font-bold text-brand-400">{m.initials?.slice(0, 2)}</div>{m.fullName}{active && <Check className="h-3 w-3 ml-auto" />}</button>; })}</div>
                </div>
                <a href={`https://trello.com/c/${selected.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-400 transition-colors"><ExternalLink className="h-3 w-3" /> Open in Trello</a>
              </div>
            </div>

            <div className="px-5 pb-5 flex justify-end gap-2 border-t border-border pt-4">
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">Cancel</button>
              <button onClick={saveCard} disabled={saving || !editName.trim()} className="px-4 py-2 rounded-lg text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
