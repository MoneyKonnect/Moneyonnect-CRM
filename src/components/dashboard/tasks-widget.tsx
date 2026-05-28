import Link from "next/link";
import {
  ArrowRight,
  Phone,
  Calendar,
  Star,
  FileWarning,
  Cake,
  CheckCircle2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { type Task, type Client } from "@prisma/client";

const TASK_TYPE_CONFIG = {
  CALL: { icon: Phone, color: "text-blue-400", bg: "bg-blue-500/10" },
  MEETING: { icon: Calendar, color: "text-violet-400", bg: "bg-violet-500/10" },
  FOLLOW_UP: { icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
  BIRTHDAY: { icon: Cake, color: "text-pink-400", bg: "bg-pink-500/10" },
  ANNIVERSARY: { icon: Cake, color: "text-rose-400", bg: "bg-rose-500/10" },
  KYC_RENEWAL: { icon: FileWarning, color: "text-orange-400", bg: "bg-orange-500/10" },
  INVESTMENT_MATURITY: { icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  DOCUMENT_EXPIRY: { icon: FileWarning, color: "text-red-400", bg: "bg-red-500/10" },
  CUSTOM: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted" },
};

const PRIORITY_CONFIG = {
  URGENT: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-muted-foreground",
  LOW: "text-muted-foreground/50",
};

type TaskWithClient = Task & { client: Pick<Client, "id" | "fullName"> | null };

interface TasksWidgetProps {
  tasks: TaskWithClient[];
}

export function TasksWidget({ tasks }: TasksWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-sm text-foreground">Due Today</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          All tasks
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {tasks.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All clear for today!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const config = TASK_TYPE_CONFIG[task.type] || TASK_TYPE_CONFIG.CUSTOM;
            const Icon = config.icon;
            const isOverdue =
              task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "COMPLETED";

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors group"
              >
                {/* Icon */}
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate font-medium">
                    {task.title}
                  </p>
                  {task.client && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {task.client.fullName}
                    </p>
                  )}
                </div>

                {/* Right */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className={cn(
                      "text-2xs font-medium px-1.5 py-0.5 rounded-full",
                      task.priority === "URGENT"
                        ? "bg-danger/10 text-danger"
                        : task.priority === "HIGH"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </span>
                  {task.dueAt && (
                    <p className={cn("text-2xs mt-1", isOverdue ? "text-danger" : "text-muted-foreground")}>
                      {isOverdue ? "Overdue" : formatDate(task.dueAt, "short")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
