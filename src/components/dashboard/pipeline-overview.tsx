import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500" },
  CONTACTED: { label: "Contacted", color: "text-cyan-400", bg: "bg-cyan-500" },
  MEETING_SCHEDULED: { label: "Meeting", color: "text-violet-400", bg: "bg-violet-500" },
  INTERESTED: { label: "Interested", color: "text-amber-400", bg: "bg-amber-500" },
  DOCUMENTATION_PENDING: { label: "Docs", color: "text-orange-400", bg: "bg-orange-500" },
  PAYMENT_PENDING: { label: "Payment", color: "text-rose-400", bg: "bg-rose-500" },
  CONVERTED: { label: "Converted", color: "text-emerald-400", bg: "bg-emerald-500" },
  DORMANT: { label: "Dormant", color: "text-muted-foreground", bg: "bg-muted-foreground" },
  LOST: { label: "Lost", color: "text-red-400", bg: "bg-red-500" },
};

interface PipelineOverviewProps {
  leadsByStage: { stage: string; _count: number }[];
}

export function PipelineOverview({ leadsByStage }: PipelineOverviewProps) {
  const stageMap = Object.fromEntries(
    leadsByStage.map((s) => [s.stage, s._count])
  );

  const total = leadsByStage.reduce((sum, s) => sum + s._count, 0);

  const stages = [
    "NEW",
    "CONTACTED",
    "MEETING_SCHEDULED",
    "INTERESTED",
    "DOCUMENTATION_PENDING",
    "PAYMENT_PENDING",
    "CONVERTED",
  ];

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-sm text-foreground">Pipeline Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} total leads across all stages
          </p>
        </div>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View pipeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {stages.map((stage) => {
            const count = stageMap[stage] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={stage}
                className={cn("h-full rounded-full", STAGE_CONFIG[stage].bg)}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Stage grid */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 p-5">
        {stages.map((stage) => {
          const count = stageMap[stage] || 0;
          const config = STAGE_CONFIG[stage];
          return (
            <Link
              key={stage}
              href={`/leads?stage=${stage}`}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition-colors group"
            >
              <div
                className={cn(
                  "text-xl font-bold tracking-tight",
                  count > 0 ? config.color : "text-muted-foreground/30"
                )}
              >
                {count}
              </div>
              <div className="text-2xs text-muted-foreground text-center leading-tight">
                {config.label}
              </div>
              <div
                className={cn(
                  "w-1 h-1 rounded-full",
                  count > 0 ? config.bg : "bg-muted-foreground/20"
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
