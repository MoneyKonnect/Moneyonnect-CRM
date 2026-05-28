"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadFormModal } from "@/components/leads/lead-form-modal";

interface KanbanColumnProps {
  stage: {
    id: string;
    label: string;
    color: string;
    dot: string;
  };
  leads: any[];
  activeId: string | null;
}

export function KanbanColumn({ stage, leads, activeId }: KanbanColumnProps) {
  const [addOpen, setAddOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = leads.reduce((sum, l) => {
    return sum + (l.estimatedValue ? Number(l.estimatedValue) : 0);
  }, 0);

  const formatCompact = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col flex-shrink-0 w-[260px] rounded-xl border transition-colors duration-150",
          isOver
            ? "border-brand-500/50 bg-brand-500/5"
            : "border-border bg-card/50"
        )}
      >
        {/* Column header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", stage.dot)} />
            <span className="text-xs font-semibold text-foreground">
              {stage.label}
            </span>
            <span className="text-2xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {leads.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {totalValue > 0 && (
              <span className="text-2xs text-muted-foreground">
                {formatCompact(totalValue)}
              </span>
            )}
            <button
              onClick={() => setAddOpen(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Drop zone + cards */}
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] no-scrollbar",
            isOver && "ring-1 ring-inset ring-brand-500/30 rounded-b-xl"
          )}
        >
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDragging={activeId === lead.id}
              />
            ))}
          </SortableContext>

          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <p className="text-2xs text-muted-foreground/50">
                Drop leads here
              </p>
            </div>
          )}
        </div>
      </div>

      <LeadFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultStage={stage.id}
      />
    </>
  );
}
