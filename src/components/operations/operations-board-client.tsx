"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, X, MoreHorizontal, Clock, Loader2,
  CheckCircle2, AlertCircle, Circle, Kanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import { createTask, updateTask, deleteTask, completeTask } from "@/actions/tasks";

const DEFAULT_COLUMNS = [
  { id: "BACKLOG",     label: "Backlog",              color: "bg-slate-400"   },
  { id: "TODO",        label: "To Do",                color: "bg-blue-400"    },
  { id: "IN_PROGRESS", label: "In Progress",          color: "bg-amber-400"   },
  { id: "PENDING",     label: "Pending with Client",  color: "bg-orange-400"  },
  { id: "DONE",        label: "Done ✅",              color: "bg-emerald-400" },
];

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", color: "text-danger",  dot: "bg-danger"   },
  HIGH:   { label: "High",   color: "text-warning", dot: "bg-warning"  },
  MEDIUM: { label: "Medium", color: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  LOW:    { label: "Low",    color: "text-muted-foreground/60", dot: "bg-muted-foreground/30" },
};

// Map task status to board column
const STATUS_TO_COL: Record<string, string> = {
  PENDING:     "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED:   "DONE",
  CANCELLED:   "DONE",
};

// Map column to task status
const COL_TO_STATUS: Record<string, string> = {
  BACKLOG:     "PENDING",
  TODO:        "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING:     "IN_PROGRESS",
  DONE:        "COMPLETED",
};

interface OperationsBoardClientProps {
  tasks: any[];
  clients: any[];
}

export function OperationsBoardClient({ tasks: initialTasks, clients }: OperationsBoardClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  // Store column assignment locally (beyond status)
  const [colMap, setColMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initialTasks.forEach(t => {
      map[t.id] = STATUS_TO_COL[t.status] || "TODO";
    });
    return map;
  });
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const getColTasks = (colId: string) =>
    tasks.filter(t => (colMap[t.id] || "TODO") === colId);

  const handleDragStart = (taskId: string) => setDragging(taskId);
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOver(colId);
  };
  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!dragging) return;
    setColMap(prev => ({ ...prev, [dragging]: colId }));
    setDragging(null);
    setDragOver(null);

    // Update task status in DB
    const newStatus = COL_TO_STATUS[colId] || "PENDING";
    if (colId === "DONE") {
      await completeTask(dragging);
    } else {
      await updateTask(dragging, { status: newStatus as any });
    }
    router.refresh();
  };

  const handleAddCard = async (colId: string) => {
    if (!newTitle.trim()) return;
    const result = await createTask({
      title: newTitle.trim(),
      type: "CUSTOM",
      priority: "MEDIUM",
      status: COL_TO_STATUS[colId] as any || "PENDING",
    });
    if (result.success && result.task) {
      const newTask = { ...result.task, client: null };
      setTasks(prev => [...prev, newTask]);
      setColMap(prev => ({ ...prev, [result.task!.id]: colId }));
      toast.success("Card added");
    }
    setNewTitle("");
    setAddingCol(null);
    router.refresh();
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteTask(taskId);
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Kanban className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Operations Board</h1>
            <p className="text-sm text-muted-foreground">{tasks.length} tasks across all columns</p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={() => { setAddingCol("TODO"); setNewTitle(""); }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Card
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-4 h-full min-w-max">
          {DEFAULT_COLUMNS.map(col => {
            const colTasks = getColTasks(col.id);
            const isOver = dragOver === col.id;
            return (
              <div
                key={col.id}
                className={cn(
                  "flex flex-col w-[280px] flex-shrink-0 rounded-xl border bg-muted/30 transition-all",
                  isOver ? "border-brand-500/40 bg-brand-500/5" : "border-border"
                )}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", col.color)} />
                    <span className="text-xs font-semibold text-foreground">{col.label}</span>
                    <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <button onClick={() => { setAddingCol(col.id); setNewTitle(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                    />
                  ))}

                  {/* Add card inline */}
                  {addingCol === col.id && (
                    <div className="rounded-lg border border-brand-500/30 bg-card p-2.5 space-y-2">
                      <Input
                        placeholder="Card title…"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAddCard(col.id);
                          if (e.key === "Escape") setAddingCol(null);
                        }}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-2xs bg-brand-500 text-white px-2 flex-1"
                          onClick={() => handleAddCard(col.id)} disabled={!newTitle.trim()}>
                          Add
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-2xs px-2"
                          onClick={() => setAddingCol(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add a card footer */}
                {addingCol !== col.id && (
                  <button
                    onClick={() => { setAddingCol(col.id); setNewTitle(""); }}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-b-xl"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add a card
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onDelete, onDragStart }: {
  task: any;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "COMPLETED";
  const isDone = task.status === "COMPLETED";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing group hover:shadow-card transition-all",
        isDone ? "border-border opacity-60" : "border-border hover:border-brand-500/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-xs font-medium leading-snug flex-1", isDone && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {task.description && (
        <p className="text-2xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", priority.dot)} />
          <span className={cn("text-2xs", priority.color)}>{priority.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {task.dueAt && (
            <span className={cn("text-2xs flex items-center gap-1", isOverdue ? "text-danger" : "text-muted-foreground")}>
              <Clock className="h-3 w-3" />
              {formatDate(task.dueAt, "short")}
            </span>
          )}
          {task.client && (
            <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-bold", generateAvatarColor(task.client.id))}>
              {getInitials(task.client.fullName)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
