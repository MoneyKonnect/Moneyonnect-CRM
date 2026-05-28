"use client";

import Link from "next/link";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  Clock,
  CheckSquare,
  MoreHorizontal,
  Edit2,
  Trash2,
  IndianRupee,
  Calendar,
  UserPlus,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatCurrency, getInitials, generateAvatarColor } from "@/lib/utils";
import { deleteLead, convertLeadToClient } from "@/actions/leads";
import { LeadFormModal } from "@/components/leads/lead-form-modal";

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: "Referral", SOCIAL_MEDIA: "Social", WEBSITE: "Website",
  COLD_CALL: "Cold Call", EVENT: "Event", ADVERTISEMENT: "Ad",
  EXISTING_CLIENT: "Existing", OTHER: "Other",
};

interface LeadCardProps { lead: any; isDragging?: boolean; onSelect?: () => void; onSchedule?: () => void; }

export function LeadCard({ lead, isDragging, onSelect, onSchedule }: LeadCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: lead.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const handleDelete = async () => {
    const result = await deleteLead(lead.id);
    if (result.success) { toast.success("Lead deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  };

  const handleConvert = async () => {
    if (!confirm(`Convert ${lead.fullName} to a client?`)) return;
    setConverting(true);
    const result = await convertLeadToClient(lead.id);
    if (result.success) {
      toast.success(`${lead.fullName} is now a client! 🎉`);
      router.push(`/clients/${result.client?.id}`);
    } else toast.error(result.error || "Failed to convert");
    setConverting(false);
  };

  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  const isConverted = lead.stage === "CONVERTED";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing",
          "hover:shadow-card-hover transition-all duration-150 group",
          (isDragging || isSortableDragging) && "opacity-40 shadow-lg scale-[0.98]",
          isConverted && "opacity-70"
        )}
        {...attributes}
        {...listeners}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-1 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xs font-semibold flex-shrink-0", generateAvatarColor(lead.id))}>
              {getInitials(lead.fullName)}
            </div>
<button
              onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-xs font-semibold text-foreground truncate hover:text-brand-400 transition-colors text-left"
            >
              {lead.fullName}
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)} onPointerDown={(e) => e.stopPropagation()}>
                <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              {!isConverted && (
                <DropdownMenuItem
                  onClick={handleConvert}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-emerald-400 focus:text-emerald-400"
                  disabled={converting}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-2" />
                  {converting ? "Converting…" : "Convert to Client"}
                </DropdownMenuItem>
              )}
              {isConverted && lead.convertedClientId && (
                <DropdownMenuItem asChild onPointerDown={(e) => e.stopPropagation()}>
                  <a href={`/clients/${lead.convertedClientId}`}>
                    <ArrowRight className="h-3.5 w-3.5 mr-2" /> View Client
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact */}
        <div className="space-y-1 mb-2.5">
          {lead.phone && (
            <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" />{lead.phone}
            </p>
          )}
          {lead.email && (
            <p className="text-2xs text-muted-foreground flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />{lead.email}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {lead.source && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {SOURCE_LABELS[lead.source] || lead.source}
            </span>
          )}
          {lead.estimatedValue && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5">
              <IndianRupee className="h-2.5 w-2.5" />
              {formatCurrency(Number(lead.estimatedValue))}
            </span>
          )}
          {isConverted && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">✓ Converted</span>
          )}
        </div>

        {/* MessageSquare quick button */}
        {lead.phone && (
          <a
            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-2xs text-emerald-400 hover:text-emerald-300 transition-colors mb-2"
          >
            <MessageSquare className="h-3 w-3" /> MessageSquare
          </a>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          {lead.nextFollowUpAt ? (
            <span className={cn("text-2xs flex items-center gap-1", isOverdue ? "text-danger" : "text-muted-foreground")}>
              <Calendar className="h-3 w-3" />
              {isOverdue ? "Overdue: " : "Follow-up: "}
              {formatDate(lead.nextFollowUpAt, "short")}
            </span>
          ) : (
            <span className="text-2xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(lead.lastActivityAt || lead.createdAt, "relative")}
            </span>
          )}
          {lead.tasks?.length > 0 && (
            <span className="text-2xs text-muted-foreground flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />{lead.tasks.length}
            </span>
          )}
        </div>
      </div>

      <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />
    </>
  );
}
