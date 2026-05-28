"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  Edit2,
  MessageSquare,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  IndianRupee,
  Activity,
  StickyNote,
  UserPlus,
  ArrowRight,
  Target,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate, formatCurrency, getInitials, generateAvatarColor } from "@/lib/utils";
import { convertLeadToClient, addLeadNote } from "@/actions/leads";
import { createTask, completeTask, deleteTask } from "@/actions/tasks";
import { LeadFormModal } from "@/components/leads/lead-form-modal";

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/10" },
  CONTACTED: { label: "Contacted", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  MEETING_SCHEDULED: { label: "Meeting Scheduled", color: "text-violet-400", bg: "bg-violet-500/10" },
  INTERESTED: { label: "Interested", color: "text-amber-400", bg: "bg-amber-500/10" },
  DOCUMENTATION_PENDING: { label: "Docs Pending", color: "text-orange-400", bg: "bg-orange-500/10" },
  PAYMENT_PENDING: { label: "Payment Pending", color: "text-rose-400", bg: "bg-rose-500/10" },
  CONVERTED: { label: "Converted", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  DORMANT: { label: "Dormant", color: "text-muted-foreground", bg: "bg-muted" },
  LOST: { label: "Lost", color: "text-danger", bg: "bg-danger/10" },
};

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: "Referral", SOCIAL_MEDIA: "Social Media", WEBSITE: "Website",
  COLD_CALL: "Cold Call", EVENT: "Event", ADVERTISEMENT: "Advertisement",
  EXISTING_CLIENT: "Existing Client", OTHER: "Other",
};

const ACTIVITY_ICONS: Record<string, any> = {
  CREATED: Star, STAGE_CHANGED: TrendingUp, NOTE: StickyNote,
  CONVERTED: CheckCircle2, CALL: Phone, MEETING: Calendar,
};

export function LeadDetailClient({ lead }: { lead: any }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const stageCfg = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.NEW;
  const isConverted = lead.stage === "CONVERTED";
  const whatsapp = lead.phone?.replace(/[^0-9]/g, "");

  const handleConvert = async () => {
    if (!confirm(`Convert ${lead.fullName} to a full client?`)) return;
    setConverting(true);
    const result = await convertLeadToClient(lead.id);
    if (result.success) {
      toast.success(`${lead.fullName} is now a client! 🎉`);
      router.push(`/clients/${result.client?.id}`);
    } else toast.error(result.error || "Failed");
    setConverting(false);
  };

  const activeTasks = lead.tasks?.filter((t: any) => !["COMPLETED", "CANCELLED"].includes(t.status)) || [];
  const completedTasks = lead.tasks?.filter((t: any) => t.status === "COMPLETED") || [];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link href="/leads" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" /> Pipeline
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className={cn("h-1 w-full", stageCfg.bg.replace("bg-", "bg-"))} style={{ background: `linear-gradient(to right, ${stageCfg.color.includes("blue") ? "#3b82f6" : stageCfg.color.includes("emerald") ? "#10b981" : stageCfg.color.includes("amber") ? "#f59e0b" : "#6366f1"}, transparent)` }} />
        <div className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold flex-shrink-0", generateAvatarColor(lead.id))}>
              {getInitials(lead.fullName)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">{lead.fullName}</h1>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", stageCfg.bg, stageCfg.color)}>
                  {stageCfg.label}
                </span>
                {isConverted && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Converted
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                    <Phone className="h-3.5 w-3.5" />{lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                    <Mail className="h-3.5 w-3.5" />{lead.email}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {lead.source && (
                  <span className="text-xs text-muted-foreground">{SOURCE_LABELS[lead.source]}</span>
                )}
                {lead.estimatedValue && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {formatCurrency(Number(lead.estimatedValue))} estimated
                  </span>
                )}
                {lead.nextFollowUpAt && (
                  <span className={cn("text-xs flex items-center gap-1", new Date(lead.nextFollowUpAt) < new Date() ? "text-danger" : "text-muted-foreground")}>
                    <Calendar className="h-3.5 w-3.5" />
                    Follow-up: {formatDate(lead.nextFollowUpAt, "medium")}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {whatsapp && (
                <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5" asChild>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-3.5 w-3.5" /> MessageSquare
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setEditOpen(true)}>
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
              {!isConverted && (
                <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5" onClick={handleConvert} disabled={converting}>
                  {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Convert to Client
                </Button>
              )}
              {isConverted && lead.convertedClient && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-emerald-400 border-emerald-500/20" asChild>
                  <Link href={`/clients/${lead.convertedClient.id}`}>
                    <ArrowRight className="h-3.5 w-3.5" /> View Client Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
            {[
              { label: "Activities", value: lead.activities?.length || 0 },
              { label: "Tasks", value: lead.tasks?.length || 0 },
              { label: "Created", value: formatDate(lead.createdAt, "short") },
              { label: "Last Activity", value: lead.lastActivityAt ? formatDate(lead.lastActivityAt, "relative") : "—" },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-2xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity">
        <TabsList className="bg-muted/50 border border-border h-9">
          {[
            { value: "activity", label: `Activity (${lead.activities?.length || 0})` },
            { value: "tasks", label: `Tasks (${activeTasks.length})` },
            { value: "notes", label: "Add Note" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4 animate-fade-in">
          <div className="space-y-3">
            {/* Add note/activity bar */}
            <QuickNoteBar leadId={lead.id} />

            {lead.activities?.length === 0 ? (
              <div className="rounded-xl border border-border bg-card flex flex-col items-center py-10 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-2 relative">
                <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                {lead.activities?.map((activity: any) => {
                  const Icon = ACTIVITY_ICONS[activity.type] || Activity;
                  return (
                    <div key={activity.id} className="flex gap-3 pl-2">
                      <div className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0 z-10">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground capitalize">
                            {activity.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                          <span className="text-2xs text-muted-foreground">{formatDate(activity.createdAt, "relative")}</span>
                        </div>
                        {activity.note && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activity.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4 animate-fade-in">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5" onClick={() => setAddTaskOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </div>
            {activeTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="rounded-xl border border-border bg-card flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...activeTasks, ...completedTasks].map((task: any) => (
                  <LeadTaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4 animate-fade-in">
          <QuickNoteBar leadId={lead.id} expanded />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />
      {addTaskOpen && (
        <AddLeadTaskModal leadId={lead.id} onClose={() => setAddTaskOpen(false)} />
      )}
    </div>
  );
}

// ── Quick Note Bar ─────────────────────────────────────────────────────────────

function QuickNoteBar({ leadId, expanded = false }: { leadId: string; expanded?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [type, setType] = useState("NOTE");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const result = await addLeadNote(leadId, note.trim());
    if (result.success) {
      toast.success("Activity logged!");
      setNote("");
      router.refresh();
    } else toast.error("Failed");
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {expanded && (
        <div className="mb-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOTE">📝 Note</SelectItem>
              <SelectItem value="CALL">📞 Call</SelectItem>
              <SelectItem value="MEETING">📅 Meeting</SelectItem>
              <SelectItem value="FOLLOW_UP">⭐ Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Textarea
        placeholder="Log a call, meeting, note, or any activity…"
        value={note}
        onChange={e => setNote(e.target.value)}
        className={cn("resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm", expanded ? "min-h-[80px]" : "min-h-[50px]")}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave(); }}
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <p className="text-2xs text-muted-foreground">⌘ + Enter to save</p>
        <Button size="sm" className="h-7 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={handleSave} disabled={!note.trim() || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Log Activity
        </Button>
      </div>
    </div>
  );
}

// ── Lead Task Row ──────────────────────────────────────────────────────────────

function LeadTaskRow({ task }: { task: any }) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    const result = await completeTask(task.id);
    if (result.success) { toast.success("Done! ✓"); router.refresh(); }
    else toast.error("Failed");
    setCompleting(false);
  };

  const handleDelete = async () => {
    const result = await deleteTask(task.id);
    if (result.success) { toast.success("Deleted"); router.refresh(); }
  };

  const isCompleted = task.status === "COMPLETED";
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && !isCompleted;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card px-4 py-3 group hover:shadow-card",
      isOverdue ? "border-danger/20" : "border-border")}>
      <button onClick={() => !isCompleted && handleComplete()} disabled={completing || isCompleted}
        className={cn("flex-shrink-0 transition-colors", isCompleted ? "text-success cursor-default" : "text-muted-foreground hover:text-success")}>
        {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</p>
        {task.dueAt && (
          <p className={cn("text-2xs flex items-center gap-1 mt-0.5", isOverdue ? "text-danger" : "text-muted-foreground")}>
            <Clock className="h-3 w-3" />{isOverdue ? "Overdue · " : ""}{formatDate(task.dueAt, "medium")}
          </p>
        )}
      </div>
      <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0",
        task.priority === "URGENT" ? "bg-danger/10 text-danger border-danger/20" :
        task.priority === "HIGH" ? "bg-warning/10 text-warning border-warning/20" :
        "bg-muted text-muted-foreground border-border")}>
        {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
      </span>
      <button onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger p-1 rounded transition-all">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────

function AddLeadTaskModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { type: "FOLLOW_UP", priority: "MEDIUM", status: "PENDING" },
  });

  const onSubmit = async (data: any) => {
    const result = await createTask({ ...data, leadId });
    if (result.success) { toast.success("Task created"); onClose(); router.refresh(); }
    else toast.error("Failed");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Task for Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Follow-up call" {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="FOLLOW_UP" onValueChange={v => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CALL","MEETING","FOLLOW_UP","CUSTOM"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="MEDIUM" onValueChange={v => setValue("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW","MEDIUM","HIGH","URGENT"].map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0)+p.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date & Time</Label>
            <Input type="datetime-local" {...register("dueAt")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
