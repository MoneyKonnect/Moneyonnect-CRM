"use client";

import { cn } from "@/lib/utils";

const STAGES = [
  { key: "INFANT", emoji: "👶", label: "Infant", age: "0–3", color: "bg-pink-500", light: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  { key: "STUDENT", emoji: "🎓", label: "Student", age: "4–22", color: "bg-blue-500", light: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { key: "EARLY_CAREER", emoji: "🚀", label: "Early Career", age: "22–30", color: "bg-cyan-500", light: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { key: "MID_CAREER", emoji: "💼", label: "Mid Career", age: "30–45", color: "bg-amber-500", light: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { key: "FAMILY_BUILDER", emoji: "🏠", label: "Family Builder", age: "35–45", color: "bg-emerald-500", light: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { key: "NEAR_RETIREMENT", emoji: "🌅", label: "Near Retirement", age: "45–60", color: "bg-orange-500", light: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { key: "RETIRED", emoji: "🎉", label: "Retired", age: "60+", color: "bg-violet-500", light: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
];

interface LifeStageTimelineProps {
  members: { id: string; fullName: string; lifeStage: string | null; dob: Date | null }[];
  compact?: boolean;
}

export function LifeStageTimeline({ members, compact = false }: LifeStageTimelineProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Life Stage Timeline</p>
      )}

      {/* Timeline bar */}
      <div className="relative">
        <div className="flex h-3 rounded-full overflow-hidden">
          {STAGES.map((stage) => (
            <div key={stage.key} className={cn("flex-1 opacity-20", stage.color)} />
          ))}
        </div>

        {/* Member markers */}
        {members.map((member) => {
          if (!member.lifeStage) return null;
          const stageIdx = STAGES.findIndex(s => s.key === member.lifeStage);
          if (stageIdx === -1) return null;
          const leftPct = ((stageIdx + 0.5) / STAGES.length) * 100;

          return (
            <div
              key={member.id}
              className="absolute -top-1.5 transform -translate-x-1/2"
              style={{ left: `${leftPct}%` }}
              title={`${member.fullName} — ${STAGES[stageIdx].label}`}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md border-2 border-white dark:border-card",
                STAGES[stageIdx].color
              )}>
                {member.fullName.charAt(0)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage labels */}
      {!compact && (
        <div className="flex">
          {STAGES.map((stage) => (
            <div key={stage.key} className="flex-1 text-center">
              <div className="text-sm">{stage.emoji}</div>
              <div className="text-2xs text-muted-foreground hidden sm:block">{stage.age}</div>
            </div>
          ))}
        </div>
      )}

      {/* Member cards */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
          {members.filter(m => m.lifeStage).map((member) => {
            const stage = STAGES.find(s => s.key === member.lifeStage);
            if (!stage) return null;
            const age = member.dob
              ? Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 86400000))
              : null;
            return (
              <div key={member.id} className={cn("rounded-lg border px-3 py-2", stage.light)}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{stage.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{member.fullName.split(" ")[0]}</p>
                    <p className="text-2xs opacity-70">{stage.label}{age ? ` · ${age}y` : ""}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
