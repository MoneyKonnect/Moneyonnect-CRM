"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  Phone,
  Calendar,
  Star,
  FileWarning,
  Cake,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { createTask, completeTask, deleteTask } from "@/actions/tasks";

const TASK_ICONS: Record<string, any> = {
  CALL: Phone, MEETING: Calendar, FOLLOW_UP: Star, BIRTHDAY: Cake,
  ANNIVERSARY: Cake, KYC_RENEWAL: FileWarning, INVESTMENT_MATURITY: Star,
  DOCUMENT_EXPIRY: FileWarning, CUSTOM: CheckSquare,
};

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", class: "bg-danger/10 text-danger border-danger/20" },
  HIGH:   { label: "High",   class: "bg-warning/10 text-warning border-warning/20" },
  MEDIUM: { label: "Medium", class: "bg-muted text-muted-foreground border-border" },
  LOW:    { label: "Low",    class: "bg-muted text-muted-foreground/60 border-border" },
};

interface TasksTabProps { client: any; }

export function TasksTab({ client }: TasksTabProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const allTasks = client.tasks || [];
  const activeTasks   = allTasks.filter((t: any) => !["COMPLETED","CANCELLED"].includes(t.status));
  const completedTasks = allTasks.filter((t: any) =>  ["COMPLETED","CANCELLED"].includes(t.status));
  const overdue = activeTasks.filter((t: any) => t.dueAt && new Date(t.dueAt) < new Date());
  const upcoming = activeTasks.filter((t: any) => !t.dueAt || new Date(t.dueAt) >= new Date());

  const handleComplete = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.success) { toast.success("Task completed! ✓"); router.refresh(); }
    else toast.error("Failed");
  };

  const handleDelete = async (taskId: string) => {
    const result = await deleteTask(taskId);
    if (result.success) { toast.success("Task deleted"); router.refresh(); }
    else toast.error("Failed");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeTasks.length} pending
          {overdue.length > 0 && <span className="text-danger ml-1.5">· {overdue.length} overdue</span>}
        </p>
        <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Task
        </Button>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-danger/20" />
            <span className="text-2xs font-semibold text-danger uppercase tracking-wider px-2">Overdue ({overdue.length})</span>
            <div className="h-px flex-1 bg-danger/20" />
          </div>
          {overdue.map((task: any) => (
            <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} isOverdue />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Upcoming ({upcoming.length})</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {upcoming.map((task: any) => (
            <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Completed toggle */}
      {completedTasks.length > 0 && (
        <div>
          <button onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-2xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-1 px-2">
              <ChevronDown className={cn("h-3 w-3 transition-transform", showCompleted && "rotate-180")} />
              Completed ({completedTasks.length})
            </span>
            <div className="h-px flex-1 bg-border" />
          </button>
          {showCompleted && (
            <div className="space-y-1.5 mt-2 opacity-60">
              {completedTasks.map((task: any) => (
                <TaskRow key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} isCompleted />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success/40 mb-2" />
          <p className="text-sm font-medium text-foreground">All clear!</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">No tasks for this client yet</p>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setAddOpen(true)}>
            Add first task
          </Button>
        </div>
      )}

      {/* Add Task Modal */}
      {addOpen && (
        <AddTaskModal clientId={client.id} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}

function TaskRow({ task, onComplete, onDelete, isOverdue, isCompleted }: {
  task: any;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isOverdue?: boolean;
  isCompleted?: boolean;
}) {
  const [completing, setCompleting] = useState(false);
  const Icon = TASK_ICONS[task.type] || CheckSquare;
  const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(task.id);
    setCompleting(false);
  };

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 group hover:shadow-card transition-all",
      isOverdue ? "border-danger/20" : "border-border"
    )}>
      <button
        onClick={() => !isCompleted && handleComplete()}
        disabled={completing || isCompleted}
        className={cn("flex-shrink-0 transition-colors",
          isCompleted ? "text-success cursor-default" : "text-muted-foreground hover:text-success")}
      >
        {completing ? <Loader2 className="h-5 w-5 animate-spin" /> :
         isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>

      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full border hidden sm:inline", priorityCfg?.class)}>
          {priorityCfg?.label}
        </span>
        {task.dueAt && (
          <span className={cn("text-2xs flex items-center gap-1",
            isOverdue ? "text-danger" : "text-muted-foreground")}>
            <Clock className="h-3 w-3" />
            {formatDate(task.dueAt, "short")}
          </span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger p-1 rounded"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddTaskModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { type: "FOLLOW_UP", priority: "MEDIUM", status: "PENDING" },
  });

  const onSubmit = async (data: any) => {
    const result = await createTask({ ...data, clientId });
    if (result.success) {
      toast.success("Task created!");
      onClose();
      router.refresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Quarterly portfolio review" {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="FOLLOW_UP" onValueChange={v => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CALL","MEETING","FOLLOW_UP","KYC_RENEWAL","INVESTMENT_MATURITY","CUSTOM"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
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
                    <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueAt")} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Time</Label>
              <Input type="time" {...register("dueTime")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional notes…" {...register("description")} />
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
