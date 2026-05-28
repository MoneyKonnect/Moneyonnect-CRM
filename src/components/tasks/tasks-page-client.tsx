"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Trash2,
  Clock,
  Phone,
  Calendar,
  Star,
  FileWarning,
  Cake,
  Filter,
  ChevronDown,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";
import { completeTask, deleteTask } from "@/actions/tasks";
import { exportTasks } from "@/actions/export";
import { TaskFormModal } from "@/components/tasks/task-form-modal";

const TASK_ICON_MAP: Record<string, any> = {
  CALL: Phone, MEETING: Calendar, FOLLOW_UP: Star, BIRTHDAY: Cake,
  ANNIVERSARY: Cake, KYC_RENEWAL: FileWarning, INVESTMENT_MATURITY: Star,
  DOCUMENT_EXPIRY: FileWarning, CUSTOM: CheckSquare,
};

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", class: "bg-danger/10 text-danger border-danger/20", dot: "bg-danger" },
  HIGH: { label: "High", class: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
  MEDIUM: { label: "Medium", class: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  LOW: { label: "Low", class: "bg-muted text-muted-foreground/60 border-border", dot: "bg-muted-foreground/40" },
};

interface TasksPageClientProps { tasks: any[]; }

export function TasksPageClient({ tasks }: TasksPageClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleComplete = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.success) { toast.success("Task completed! ✓"); router.refresh(); }
    else toast.error("Failed to complete task");
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    const result = await deleteTask(taskId);
    if (result.success) { toast.success("Task deleted"); router.refresh(); }
    else toast.error("Failed to delete task");
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportTasks();
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || "tasks.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tasks exported!");
    } else toast.error("Export failed");
    setExporting(false);
  };

  const filtered = tasks.filter((t) => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (!showCompleted && ["COMPLETED", "CANCELLED"].includes(t.status)) return false;
    return true;
  });

  const activeTasks = filtered.filter((t) => !["COMPLETED", "CANCELLED"].includes(t.status));
  const completedTasks = filtered.filter((t) => ["COMPLETED", "CANCELLED"].includes(t.status));
  const overdue = activeTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const upcoming = activeTasks.filter((t) => !t.dueAt || new Date(t.dueAt) >= new Date());

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              {activeTasks.length} pending
              {overdue.length > 0 && <span className="text-danger ml-1.5">· {overdue.length} overdue</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {priorityFilter || "Priority"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)}>
                  {p || "All priorities"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-danger/20" />
            <span className="text-2xs font-semibold text-danger uppercase tracking-wider px-2">Overdue ({overdue.length})</span>
            <div className="h-px flex-1 bg-danger/20" />
          </div>
          <div className="space-y-1.5">
            {overdue.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} isOverdue />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Upcoming ({upcoming.length})</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-1.5">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Completed toggle */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="px-2 flex items-center gap-1">
              <ChevronDown className={cn("h-3 w-3 transition-transform", showCompleted && "rotate-180")} />
              Completed ({completedTasks.length})
            </span>
            <div className="h-px flex-1 bg-border" />
          </button>
          {showCompleted && (
            <div className="space-y-1.5 opacity-60">
              {completedTasks.map((task) => (
                <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} isCompleted />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-success/40 mb-3" />
          <h3 className="font-medium text-foreground mb-1">All caught up!</h3>
          <p className="text-sm text-muted-foreground">No tasks here yet.</p>
          <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => setAddOpen(true)}>Add your first task</Button>
        </div>
      )}

      <TaskFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

function TaskRow({ task, onComplete, onDelete, isOverdue, isCompleted }: {
  task: any; onComplete: (id: string) => void; onDelete: (id: string) => void;
  isOverdue?: boolean; isCompleted?: boolean;
}) {
  const Icon = TASK_ICON_MAP[task.type] || CheckSquare;
  const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card px-4 py-3 group hover:shadow-card transition-shadow",
      isOverdue ? "border-danger/20" : "border-border")}>
      <button
        onClick={() => !isCompleted && onComplete(task.id)}
        className={cn("flex-shrink-0 transition-colors",
          isCompleted ? "text-success cursor-default" : "text-muted-foreground hover:text-success")}
      >
        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {task.client && <span className="text-xs text-muted-foreground">{task.client.fullName}</span>}
          {task.description && <span className="text-xs text-muted-foreground truncate hidden sm:block">{task.description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full border hidden sm:inline", priorityCfg?.class)}>
          {priorityCfg?.label}
        </span>
        {task.dueAt && (
          <span className={cn("text-2xs flex items-center gap-1", isOverdue ? "text-danger" : "text-muted-foreground")}>
            <Clock className="h-3 w-3" />{formatDate(task.dueAt, "short")}
          </span>
        )}
        <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger p-1 rounded">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
