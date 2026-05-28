"use client";
import { exportSingleLead, exportConvertedLeads } from "@/lib/export-xlsx";
import { MeetingSchedulerModal } from "@/components/leads/meeting-scheduler-modal";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { moveLeadStage } from "@/actions/leads";
import { KanbanColumn } from "@/components/leads/kanban-column";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadDrawer } from "@/components/leads/lead-drawer";

const PIPELINE_STAGES = [
  { id: "NEW", label: "New", color: "text-blue-400", dot: "bg-blue-500" },
  { id: "CONTACTED", label: "Contacted", color: "text-cyan-400", dot: "bg-cyan-500" },
  { id: "MEETING_SCHEDULED", label: "Meeting", color: "text-violet-400", dot: "bg-violet-500" },
  { id: "INTERESTED", label: "Interested", color: "text-amber-400", dot: "bg-amber-500" },
  { id: "DOCUMENTATION_PENDING", label: "Docs Pending", color: "text-orange-400", dot: "bg-orange-500" },
  { id: "PAYMENT_PENDING", label: "Payment", color: "text-rose-400", dot: "bg-rose-500" },
  { id: "CONVERTED", label: "Converted", color: "text-emerald-400", dot: "bg-emerald-500" },
] as const;

interface LeadPipelineBoardProps {
  grouped: Record<string, any[]>;
}

export function LeadPipelineBoard({ grouped }: LeadPipelineBoardProps) {
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [schedulingLead, setSchedulingLead] = useState<any>(null);
  const [localGrouped, setLocalGrouped] = useState(grouped);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which column a lead belongs to
  const findLeadColumn = useCallback(
    (leadId: string): string | null => {
      for (const [stage, leads] of Object.entries(localGrouped)) {
        if ((leads as any[]).some((l: any) => l.id === leadId)) return stage;
      }
      return null;
    },
    [localGrouped]
  );

  const findLead = useCallback(
    (leadId: string): any => {
      for (const leads of Object.values(localGrouped)) {
        const found = (leads as any[]).find((l: any) => l.id === leadId);
        if (found) return found;
      }
      return null;
    },
    [localGrouped]
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(active.id as string);
      setActiveLead(findLead(active.id as string));
    },
    [findLead]
  );

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return;

      const activeColumn = findLeadColumn(active.id as string);
      const overStage = PIPELINE_STAGES.find((s) => s.id === over.id)?.id;
      const overColumn = overStage || findLeadColumn(over.id as string);

      if (!activeColumn || !overColumn || activeColumn === overColumn) return;

      setLocalGrouped((prev) => {
        const lead = (prev[activeColumn] as any[]).find(
          (l: any) => l.id === active.id
        );
        if (!lead) return prev;

        return {
          ...prev,
          [activeColumn]: (prev[activeColumn] as any[]).filter(
            (l: any) => l.id !== active.id
          ),
          [overColumn]: [...(prev[overColumn] as any[]), lead],
        };
      });
    },
    [findLeadColumn]
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      setActiveLead(null);

      if (!over) return;

      const overStage = PIPELINE_STAGES.find((s) => s.id === over.id)?.id;
      const newColumn = overStage || findLeadColumn(over.id as string);

      if (!newColumn) return;

      // Check if actually moved
      const originalColumn = grouped[newColumn]?.some(
        (l: any) => l.id === active.id
      )
        ? null
        : Object.entries(grouped).find(([, leads]) =>
            (leads as any[]).some((l: any) => l.id === active.id)
          )?.[0];

      if (originalColumn && originalColumn !== newColumn) {
        const result = await moveLeadStage(active.id as string, newColumn);
        if (!result.success) {
          toast.error("Failed to move lead");
          setLocalGrouped(grouped); // revert
        } else {
          toast.success(`Moved to ${PIPELINE_STAGES.find((s) => s.id === newColumn)?.label || newColumn}`);
          router.refresh();
        }
      }
    },
    [grouped, findLeadColumn, router]
  );

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-2 no-scrollbar">
        {PIPELINE_STAGES.map((stage) => {
          const leads = (localGrouped[stage.id] || []) as any[];
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leads}
              activeId={activeId}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 opacity-95">
            <LeadCard lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    {/* Meeting Scheduler */}
    {schedulingLead && (
      <MeetingSchedulerModal
        lead={schedulingLead}
        allLeads={allLeads}
        open={!!schedulingLead}
        onClose={() => setSchedulingLead(null)}
      />
    )}
    {/* Lead Drawer */}
    {selectedLead && (
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    )}
    </>
  );
}
