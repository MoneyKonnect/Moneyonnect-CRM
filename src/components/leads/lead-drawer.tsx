"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import {
  X, Phone, Mail, Calendar, Clock, TrendingUp, Edit2, MessageSquare,
  Plus, CheckCircle2, Circle, Trash2, Loader2, IndianRupee, Activity,
  StickyNote, UserPlus, ArrowRight, ChevronRight, Tag, AlignLeft,
  CheckSquare, FileText, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, formatCurrency, getInitials, generateAvatarColor } from "@/lib/utils";
import { moveLeadStage, convertLeadToClient, addLeadNote } from "@/actions/leads";
import { createTask, completeTask, deleteTask } from "@/actions/tasks";

const STAGES = [
  { value: "NEW",                   label: "New",              color: "bg-blue-500"   },
  { value: "CONTACTED",             label: "Contacted",        color: "bg-cyan-500"   },
  { value: "MEETING_SCHEDULED",     label: "Meeting",          color: "bg-violet-500" },
  { value: "INTERESTED",            label: "Interested",       color: "bg-amber-500"  },
  { value: "DOCUMENTATION_PENDING", label: "Docs Pending",     color: "bg-orange-500" },
  { value: "PAYMENT_PENDING",       label: "Payment Pending",  color: "bg-rose-500"   },
  { value: "CONVERTED",             label: "Converted",        color: "bg-emerald-500"},
  { value: "LOST",                  label: "Lost",             color: "bg-red-500"    },
];

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: "Referral", SOCIAL_MEDIA: "Social Media", WEBSITE: "Website",
  COLD_CALL: "Cold Call", EVENT: "Event", ADVERTISEMENT: "Ad",
  EXISTING_CLIENT: "Existing Client", OTHER: "Other",
};

interface LeadDrawerProps {
  lead: any;
  onClose: () => void;
}

export function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"activity" | "tasks">("activity");
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [currentStage, setCurrentStage] = useState(lead.stage);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleStageChange = async (newStage: string) => {
    setCurrentStage(newStage);
    const result = await moveLeadStage(lead.id, newStage);
    if (result.success) { toast.success("Stage updated"); router.refresh(); }
    else toast.error("Failed");
  };

  const handleLogNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const result = await addLeadNote(lead.id, note.trim());
    if (result.success) { toast.success("Activity logged"); setNote(""); router.refresh(); }
    else toast.error("Failed");
    setSavingNote(false);
  };

  const handleConvert = async () => {
    if (!confirm(`Convert ${lead.fullName} to a client?`)) return;
    setConverting(true);
    const result = await convertLeadToClient(lead.id);
    if (result.success) {
      toast.success(`${lead.fullName} is now a client! 🎉`);
      onClose();
      router.push(`/clients/${result.client?.id}`);
    } else toast.error(result.error || "Failed");
    setConverting(false);
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    const result = await createTask({
      title: taskTitle,
      leadId: lead.id,
      type: "FOLLOW_UP",
      priority: "MEDIUM",
      status: "PENDING",
      dueAt: taskDue || undefined,
    });
    if (result.success) { toast.success("Task added"); setTaskTitle(""); setTaskDue(""); setAddingTask(false); router.refresh(); }
    else toast.error("Failed");
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
    router.refresh();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    router.refresh();
  };

  const stageCfg = STAGES.find(s => s.value === currentStage) || STAGES[0];
  const whatsapp = lead.phone?.replace(/[^0-9]/g, "");
  const activeTasks = lead.tasks?.filter((t: any) => t.status !== "COMPLETED") || [];
  const completedTasks = lead.tasks?.filter((t: any) => t.status === "COMPLETED") || [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold flex-shrink-0", generateAvatarColor(lead.id))}>
            {getInitials(lead.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{lead.fullName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Stage selector */}
              <Select value={currentStage} onValueChange={handleStageChange}>
                <SelectTrigger className="h-6 text-2xs border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", stageCfg.color)} />
                    <span className="font-medium">{stageCfg.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", s.color)} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lead.source && <span className="text-2xs text-muted-foreground">{SOURCE_LABELS[lead.source]}</span>}
              {lead.estimatedValue && (
                <span className="text-2xs text-emerald-400 font-medium flex items-center gap-0.5">
                  <IndianRupee className="h-2.5 w-2.5" />{formatCurrency(Number(lead.estimatedValue))}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {whatsapp && (
              <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 gap-1" asChild>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {lead.stage !== "CONVERTED" && (
              <Button size="sm" className="h-7 bg-brand-500 hover:bg-brand-600 text-white text-xs px-2 gap-1" onClick={handleConvert} disabled={converting}>
                {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Convert</span>
              </Button>
            )}
            {lead.stage === "CONVERTED" && lead.convertedClientId && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1 text-emerald-400 border-emerald-500/20" asChild>
                <Link href={`/clients/${lead.convertedClientId}`} onClick={onClose}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contact info */}
        <div className="px-5 py-3 border-b border-border flex flex-wrap gap-4">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <Phone className="h-3.5 w-3.5" />{lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors truncate max-w-[200px]">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />{lead.email}
            </a>
          )}
          {lead.nextFollowUpAt && (
            <span className={cn("text-sm flex items-center gap-1.5", new Date(lead.nextFollowUpAt) < new Date() ? "text-danger" : "text-muted-foreground")}>
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(lead.nextFollowUpAt, "medium")}
            </span>
          )}
        </div>

        {/* Notes field */}
        {lead.notes && (
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-start gap-2">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">{lead.notes}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {[
            { id: "activity", label: "Activity", icon: Activity, count: lead.activities?.length || 0 },
            { id: "tasks",    label: "Tasks",    icon: CheckSquare, count: activeTasks.length },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                  activeTab === tab.id ? "border-brand-500 text-brand-400" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("text-2xs px-1.5 py-0.5 rounded-full", activeTab === tab.id ? "bg-brand-500/15 text-brand-400" : "bg-muted text-muted-foreground")}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "activity" && (
            <div className="p-4 space-y-3">
              {/* Log activity */}
              <div className="rounded-xl border border-border bg-card/50 p-3">
                <Textarea
                  placeholder="Log a call, meeting, note…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0 p-0 text-sm bg-transparent"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleLogNote(); }}
                />
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <p className="text-2xs text-muted-foreground">⌘+Enter to save</p>
                  <Button size="sm" className="h-6 text-2xs bg-brand-500 hover:bg-brand-600 text-white px-2"
                    onClick={handleLogNote} disabled={!note.trim() || savingNote}>
                    {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Log"}
                  </Button>
                </div>
              </div>

              {/* Activity timeline */}
              {lead.activities?.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lead.activities?.map((a: any) => (
                    <div key={a.id} className="flex gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground capitalize">{a.type.replace(/_/g, " ").toLowerCase()}</p>
                        {a.note && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.note}</p>}
                        <p className="text-2xs text-muted-foreground mt-0.5">{formatDate(a.createdAt, "relative")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="p-4 space-y-3">
              {/* Add task */}
              {addingTask ? (
                <div className="rounded-xl border border-brand-500/20 bg-card p-3 space-y-2">
                  <Input placeholder="Task title…" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    className="h-8 text-sm" autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleAddTask(); if (e.key === "Escape") setAddingTask(false); }} />
                  <div className="flex items-center gap-2">
                    <Input type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="h-7 text-xs flex-1" />
                    <Button size="sm" className="h-7 text-xs bg-brand-500 text-white" onClick={handleAddTask} disabled={!taskTitle.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingTask(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-dashed" onClick={() => setAddingTask(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add task
                </Button>
              )}

              {/* Tasks list */}
              {activeTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="text-center py-6">
                  <CheckSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                </div>
              ) : (
                <>
                  {activeTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2.5 group rounded-lg border border-border bg-card/50 px-3 py-2.5 hover:shadow-card transition-shadow">
                      <button onClick={() => handleCompleteTask(task.id)} className="text-muted-foreground hover:text-success transition-colors flex-shrink-0">
                        <Circle className="h-4 w-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        {task.dueAt && (
                          <p className={cn("text-2xs flex items-center gap-1 mt-0.5", new Date(task.dueAt) < new Date() ? "text-danger" : "text-muted-foreground")}>
                            <Clock className="h-3 w-3" />{formatDate(task.dueAt, "short")}
                          </p>
                        )}
                      </div>
                      <span className={cn("text-2xs px-1.5 py-0.5 rounded-full border flex-shrink-0",
                        task.priority === "URGENT" ? "bg-danger/10 text-danger border-danger/20" :
                        task.priority === "HIGH" ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-muted text-muted-foreground border-border")}>
                        {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                      </span>
                      <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {completedTasks.length > 0 && (
                    <div className="space-y-1 opacity-50">
                      <p className="text-2xs text-muted-foreground px-1">Completed ({completedTasks.length})</p>
                      {completedTasks.map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2.5 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                          <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="text-2xs text-muted-foreground">Created {formatDate(lead.createdAt, "medium")}</span>
            {lead.lastActivityAt && (
              <span className="text-2xs text-muted-foreground">· Last activity {formatDate(lead.lastActivityAt, "relative")}</span>
            )}
          </div>
          <Link href={`/leads/${lead.id}`} onClick={onClose}
            className="text-2xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            Full page <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
