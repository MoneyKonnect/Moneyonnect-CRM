"use client";
import { useState } from "react";
import { Ticket, Plus, X, Loader2, AlertTriangle, Clock, CheckCircle2, Circle, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  OPEN:        { label: "Open",        icon: Circle,        color: "text-sky-400" },
  IN_PROGRESS: { label: "In Progress", icon: Clock,         color: "text-amber-400" },
  DONE:        { label: "Done",        icon: CheckCircle2,  color: "text-emerald-400" },
  OVERDUE:     { label: "Overdue",     icon: AlertTriangle, color: "text-red-400" },
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-zinc-400", MEDIUM: "text-amber-400", HIGH: "text-orange-400", URGENT: "text-red-400",
};

export default function TicketsClient({ tickets: initial, teamMembers, isSuperAdmin, myUserId }: any) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedToId: "", priority: "MEDIUM" });

  const create = async () => {
    if (!form.title.trim() || !form.assignedToId) { toast.error("Title and assignee required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setTickets((p: any) => [data.ticket, ...p]);
      setForm({ title: "", description: "", assignedToId: "", priority: "MEDIUM" });
      setOpen(false);
      toast.success("Ticket assigned!");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setTickets((p: any) => p.map((t: any) => t.id === id ? data.ticket : t));
      toast.success("Updated!");
    } catch { toast.error("Failed"); }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm("Delete this ticket?")) return;
    try {
      await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      setTickets((p: any) => p.filter((t: any) => t.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  };

  const overdue = tickets.filter((t: any) => t.status === "OVERDUE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">My Work</h1>
            <p className="text-sm text-muted-foreground">
              {overdue.length > 0 && <span className="text-red-400">{overdue.length} overdue · </span>}
              {tickets.filter((t: any) => t.status !== "DONE").length} active tickets
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-brand-500 text-white hover:bg-brand-600 transition-all">
            <Plus className="h-4 w-4" /> Assign Work
          </button>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-medium">{overdue.length} ticket{overdue.length > 1 ? "s are" : " is"} overdue!</p>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tickets yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...tickets].sort((a: any, b: any) => {
            const order: any = { OVERDUE: 0, IN_PROGRESS: 1, OPEN: 2, DONE: 3 };
            return (order[a.status] ?? 4) - (order[b.status] ?? 4);
          }).map((ticket: any) => {
            const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
            const Icon = cfg.icon;
            const hours = Math.round((new Date(ticket.dueAt).getTime() - Date.now()) / 3600000);
            const isMyTicket = ticket.assignedTo.id === myUserId;
            return (
              <div key={ticket.id} className={cn("rounded-xl border bg-card p-4 space-y-3", ticket.status === "OVERDUE" ? "border-red-500/30" : "border-border", ticket.status === "DONE" && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", cfg.color)} />
                    <div>
                      <p className={cn("text-sm font-medium", ticket.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground")}>{ticket.title}</p>
                      {ticket.description && <p className="text-xs text-muted-foreground mt-0.5">{ticket.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-xs font-medium", PRIORITY_COLOR[ticket.priority])}>{ticket.priority}</span>
                    {isSuperAdmin && <button onClick={() => deleteTicket(ticket.id)} className="p-1 rounded text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.assignedTo.name}</span>
                    <span className={cn("flex items-center gap-1", ticket.status === "DONE" ? "text-emerald-400" : ticket.status === "OVERDUE" ? "text-red-400" : hours < 4 ? "text-orange-400" : "")}>
                      <Clock className="h-3 w-3" />
                      {ticket.status === "DONE" ? "Done" : ticket.status === "OVERDUE" ? "Overdue" : hours < 24 ? `${hours}h left` : `${Math.floor(hours/24)}d left`}
                    </span>
                  </div>
                  {(isMyTicket || isSuperAdmin) && ticket.status !== "DONE" && (
                    <div className="flex gap-1.5">
                      {ticket.status === "OPEN" && <button onClick={() => updateStatus(ticket.id, "IN_PROGRESS")} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all font-medium">Start</button>}
                      {(ticket.status === "IN_PROGRESS" || ticket.status === "OVERDUE") && <button onClick={() => updateStatus(ticket.id, "DONE")} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all font-medium">Mark Done</button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Assign Work Ticket</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Review KYC for Rajesh Sharma" className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Add instructions..." className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Assign To *</label>
                <select value={form.assignedToId} onChange={(e) => setForm(f => ({ ...f, assignedToId: e.target.value }))} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">
                  <option value="">Select team member...</option>
                  {teamMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority</label>
                <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400">Deadline auto-set to <strong>48 hours</strong> from now</p>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-all">Cancel</button>
              <button onClick={create} disabled={saving || !form.title.trim() || !form.assignedToId} className="px-4 py-2 rounded-lg text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
