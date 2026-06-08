"use client";
import { useEffect, useState, useRef } from "react";
import { ExternalLink, RefreshCw, Plus, X, Calendar, Trash2, Loader2, AlertCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const KEY = "b85ba5057f173e2b7363a717e2c48211";
const TOKEN = "ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE";
const BOARD_ID = "sxYFo8yq";
const BOARD_URL = "https://trello.com/b/sxYFo8yq";
const BASE = "https://api.trello.com/1";
const Q = `key=${KEY}&token=${TOKEN}`;

interface Card { id: string; name: string; desc: string; due: string|null; dueComplete: boolean; labels: any[]; members: any[]; idList: string; pos: number; }
interface TList { id: string; name: string; cards: Card[]; }

const COLORS: Record<string,string> = { red:"bg-red-500", orange:"bg-orange-500", yellow:"bg-yellow-500", green:"bg-emerald-500", blue:"bg-blue-500", purple:"bg-purple-500", pink:"bg-pink-500", sky:"bg-sky-500", lime:"bg-lime-500", black:"bg-zinc-500" };

export default function LeadsBoardClient() {
  const [lists, setLists] = useState<TList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [selected, setSelected] = useState<Card|null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<string|null>(null);
  const [newCard, setNewCard] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const dragRef = useRef<{cardId:string;fromList:string}|null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [lr, cr] = await Promise.all([
        fetch(`${BASE}/boards/${BOARD_ID}/lists?fields=id,name&${Q}`),
        fetch(`${BASE}/boards/${BOARD_ID}/cards?fields=id,name,desc,due,dueComplete,labels,idList,pos&members=true&member_fields=fullName,initials&${Q}`)
      ]);
      if (!lr.ok) throw new Error();
      const [ld, cd] = await Promise.all([lr.json(), cr.json()]);
      setLists(ld.map((l:any) => ({ ...l, cards: cd.filter((c:any) => c.idList===l.id).sort((a:any,b:any) => a.pos-b.pos) })));
    } catch { setError("Could not load Leads Board."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const open = (c: Card) => { setSelected(c); setEditName(c.name); setEditDesc(c.desc||""); setEditDue(c.due ? c.due.slice(0,10) : ""); };

  const save = async () => {
    if (!selected) return; setSaving(true);
    try {
      const body: any = { name: editName, desc: editDesc, due: editDue ? new Date(editDue).toISOString() : null };
      const r = await fetch(`${BASE}/cards/${selected.id}?${Q}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if (!r.ok) throw new Error();
      toast.success("Saved"); setSelected(null); load();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const del = async () => {
    if (!selected||!confirm("Delete?")) return;
    try { await fetch(`${BASE}/cards/${selected.id}?${Q}`, {method:"DELETE"}); toast.success("Deleted"); setSelected(null); load(); }
    catch { toast.error("Failed"); }
  };

  const move = async (cardId:string, toList:string) => {
    try { await fetch(`${BASE}/cards/${cardId}?${Q}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({idList:toList,pos:"bottom"})}); load(); }
    catch { toast.error("Failed"); }
  };

  const add = async (listId:string) => {
    if (!newCard.trim()) return; setAddingCard(true);
    try {
      const r = await fetch(`${BASE}/cards?${Q}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newCard.trim(),idList:listId,pos:"bottom"})});
      if (!r.ok) throw new Error();
      toast.success("Card added"); setNewCard(""); setAddingTo(null); load();
    } catch { toast.error("Failed"); } finally { setAddingCard(false); }
  };

  const total = lists.reduce((a,l) => a+l.cards.length, 0);

  if (loading) return <div className="p-6 flex items-center gap-3 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/><span className="text-sm">Loading Leads Board...</span></div>;
  if (error) return <div className="p-6"><div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5"><AlertCircle className="h-5 w-5 text-red-400"/><div><p className="text-sm">{error}</p><button onClick={load} className="text-xs text-brand-400 hover:underline mt-1">Retry</button></div></div></div>;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Leads Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} cards · {lists.length} lists</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all"><RefreshCw className="h-3.5 w-3.5"/> Refresh</button>
          <a href={BOARD_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 transition-all"><ExternalLink className="h-3.5 w-3.5"/> Open Trello</a>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
        {lists.map(list => (
          <div key={list.id} className="flex-shrink-0 flex flex-col" style={{width:272}} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragRef.current){move(dragRef.current.cardId,list.id);dragRef.current=null;}}}>
            <div className="bg-card border border-border rounded-xl flex flex-col h-full max-h-[calc(100vh-220px)]">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold">{list.name}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{list.cards.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {list.cards.map(card => {
                  const due = card.due ? new Date(card.due) : null;
                  const overdue = due && due < new Date() && !card.dueComplete;
                  return (
                    <div key={card.id} draggable onDragStart={()=>{dragRef.current={cardId:card.id,fromList:list.id};}} onClick={()=>open(card)} className="p-3 rounded-lg bg-background border border-border hover:border-brand-500/40 cursor-pointer group transition-all">
                      {card.labels?.length>0 && <div className="flex flex-wrap gap-1 mb-1.5">{card.labels.map((l,i)=><span key={i} className={`w-8 h-1.5 rounded-full ${COLORS[l.color]||"bg-zinc-500"}`}/>)}</div>}
                      <p className="text-sm group-hover:text-brand-400 transition-colors">{card.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        {due && <span className={cn("text-2xs flex items-center gap-1 px-1.5 py-0.5 rounded-full", card.dueComplete?"bg-emerald-500/15 text-emerald-400":overdue?"bg-red-500/15 text-red-400":"bg-muted text-muted-foreground")}><Calendar className="h-2.5 w-2.5"/>{due.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                        {card.members?.length>0 && <div className="flex -space-x-1 ml-auto">{card.members.slice(0,3).map((m,i)=><div key={i} title={m.fullName} className="w-5 h-5 rounded-full bg-brand-500/20 border border-background flex items-center justify-center text-2xs font-bold text-brand-400">{m.initials?.slice(0,2)}</div>)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-2 border-t border-border flex-shrink-0">
                {addingTo===list.id ? (
                  <div className="space-y-2">
                    <textarea autoFocus value={newCard} onChange={e=>setNewCard(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();add(list.id);}if(e.key==="Escape"){setAddingTo(null);setNewCard("");}}} placeholder="Card title..." rows={2} className="w-full text-sm bg-background border border-border rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground"/>
                    <div className="flex gap-1.5">
                      <button onClick={()=>add(list.id)} disabled={addingCard||!newCard.trim()} className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all">{addingCard?<Loader2 className="h-3 w-3 animate-spin"/>:"Add"}</button>
                      <button onClick={()=>{setAddingTo(null);setNewCard("");}} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5"/></button>
                    </div>
                  </div>
                ) : <button onClick={()=>setAddingTo(list.id)} className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all"><Plus className="h-3.5 w-3.5"/> Add card</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="font-semibold">Edit Card</h2>
              <div className="flex gap-2">
                <button onClick={del} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="h-4 w-4"/></button>
                <button onClick={()=>setSelected(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-4 w-4"/></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label><input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"/></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label><textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} rows={3} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" placeholder="Add description..."/></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</label><input type="date" value={editDue} onChange={e=>setEditDue(e.target.value)} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"/></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Move to List</label><select value={selected.idList} onChange={e=>{move(selected.id,e.target.value);setSelected(null);}} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">{lists.map(l=><option key={l.id} value={l.id}>{l.name}{l.id===selected.idList?" (current)":""}</option>)}</select></div>
            </div>
            <div className="px-5 pb-5 flex items-center justify-between">
              <a href={`https://trello.com/c/${selected.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-brand-400 flex items-center gap-1"><ExternalLink className="h-3 w-3"/> Open in Trello</a>
              <div className="flex gap-2">
                <button onClick={()=>setSelected(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent">Cancel</button>
                <button onClick={save} disabled={saving||!editName.trim()} className="px-4 py-1.5 rounded-lg text-xs bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5">{saving?<Loader2 className="h-3 w-3 animate-spin"/>:null}Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
