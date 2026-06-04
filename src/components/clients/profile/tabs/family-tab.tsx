"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Crown,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  UserPlus,
  ArrowRight,
  X,
  Heart,
  Zap,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Cake,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDate, getInitials, generateAvatarColor, formatCurrency } from "@/lib/utils";
import { LifeStageTimeline } from "@/components/intelligence/life-stage-timeline";
import {
  createFamilyGroup, createFamilyMember, updateFamilyMember,
  deleteFamilyMember, convertMemberToLead, convertMemberToClient,
  triggerMarriageEvent, updateSuggestionStatus, addCustomSuggestion,
  linkExistingClientToFamily,
} from "@/actions/family";

// ─── Config ─────────────────────────────────────────────────────────────────

const LIFE_STAGE_CONFIG = {
  INFANT: { label: "Infant", emoji: "👶", color: "text-pink-400", bg: "bg-pink-500/10" },
  STUDENT: { label: "Student", emoji: "🎓", color: "text-blue-400", bg: "bg-blue-500/10" },
  EARLY_CAREER: { label: "Early Career", emoji: "🚀", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  MID_CAREER: { label: "Mid Career", emoji: "💼", color: "text-amber-400", bg: "bg-amber-500/10" },
  FAMILY_BUILDER: { label: "Family Builder", emoji: "🏠", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  NEAR_RETIREMENT: { label: "Near Retirement", emoji: "🌅", color: "text-orange-400", bg: "bg-orange-500/10" },
  RETIRED: { label: "Retired", emoji: "🎉", color: "text-violet-400", bg: "bg-violet-500/10" },
};

const DEPENDENCY_CONFIG = {
  DEPENDENT: { label: "Dependent", color: "text-rose-400", bg: "bg-rose-500/10" },
  INDEPENDENT: { label: "Independent", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  SUPPORTER: { label: "Supporter", color: "text-blue-400", bg: "bg-blue-500/10" },
};

const SUGGESTION_STATUS_CONFIG = {
  NEW: { label: "New", color: "text-brand-400", bg: "bg-brand-500/10", border: "border-brand-500/20" },
  DISCUSSED: { label: "Discussed", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  IN_PROGRESS: { label: "In Progress", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  COMPLETED: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  NOT_INTERESTED: { label: "Not Interested", color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

const RELATIONSHIP_OPTIONS = [
  "SPOUSE", "SON", "DAUGHTER", "PARENT", "SIBLING", "GRANDPARENT", "GRANDCHILD",
  "DAUGHTER_IN_LAW", "SON_IN_LAW", "MOTHER_IN_LAW", "FATHER_IN_LAW",
  "UNCLE", "AUNT", "NEPHEW", "NIECE", "COUSIN", "OTHER",
];

// ─── Main Tab ────────────────────────────────────────────────────────────────

interface FamilyTabProps {
  client: any;
  familyGroups?: any[];
}

export function FamilyTab({ client, familyGroups = [] }: FamilyTabProps) {
  const router = useRouter();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Family & HUF</h2>
          <span className="text-xs text-muted-foreground">
            ({familyGroups.length} group{familyGroups.length !== 1 ? "s" : ""})
          </span>
        </div>
        <Button
          size="sm"
          className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={() => setCreateGroupOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Family / HUF
        </Button>
      </div>

      {/* No groups */}
      {familyGroups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No family groups yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create a family group to map relationships, life stages, and get financial product suggestions.
          </p>
          <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => setCreateGroupOpen(true)}>
            Create first group
          </Button>
        </div>
      )}

      {/* Family Groups */}
      {familyGroups.map((group) => (
        <FamilyGroupCard
          key={group.id}
          group={group}
          clientId={client.id}
          onRefresh={() => router.refresh()}
        />
      ))}

      {/* Create Group Modal */}
      <CreateFamilyGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        clientId={client.id}
      />
    </div>
  );
}

// ─── Family Group Card ───────────────────────────────────────────────────────

function FamilyGroupCard({ group, clientId, onRefresh }: { group: any; clientId: string; onRefresh: () => void }) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const isHUF = group.groupType === "HUF";
  const totalAUM = group.members.reduce((sum: number, m: any) => {
    return sum + (m.linkedClient?.aum ? Number(m.linkedClient.aum) : 0);
  }, 0);

  const handleDeleteGroup = async () => {
    if (!confirm(`Delete "${group.name}"? This will remove all members.`)) return;
    const { deleteFamilyGroup } = await import("@/actions/family");
    const result = await deleteFamilyGroup(group.id);
    if (result.success) { toast.success("Family group deleted"); onRefresh(); }
    else toast.error(result.error || "Failed");
  };

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      isHUF ? "border-violet-500/30 bg-violet-500/5" : "border-border bg-card"
    )}>
      {/* Group header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isHUF ? "bg-violet-500/20" : "bg-brand-500/10"
          )}>
            {isHUF ? (
              <Crown className={cn("h-4 w-4", "text-violet-400")} />
            ) : (
              <Users className="h-4 w-4 text-brand-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{group.name}</p>
              <span className={cn(
                "text-2xs font-medium px-1.5 py-0.5 rounded-full",
                isHUF ? "bg-violet-500/15 text-violet-400" : "bg-brand-500/15 text-brand-400"
              )}>
                {isHUF ? "HUF" : "Family"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-2xs text-muted-foreground">
                {group.members.length} member{group.members.length !== 1 ? "s" : ""}
              </span>
              {isHUF && group.kartaName && (
                <span className="text-2xs text-muted-foreground">
                  Karta: {group.kartaName}
                </span>
              )}
              {totalAUM > 0 && (
                <span className="text-2xs text-emerald-400 font-medium">
                  Combined AUM: {formatCurrency(totalAUM)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setAddMemberOpen(true)}
          >
            <Plus className="h-3 w-3" /> Add Member
          </Button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDeleteGroup}
            className="text-muted-foreground hover:text-danger p-1 rounded transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Members */}
      {expanded && (
        <div className="p-4 space-y-3">
          {group.members.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No members yet</p>
              <Button size="sm" variant="ghost" className="text-xs mt-2" onClick={() => setAddMemberOpen(true)}>
                Add first member
              </Button>
            </div>
          ) : (
            <>
            <LifeStageTimeline members={group.members} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.members.map((member: any) => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  groupId={group.id}
                  isHUF={isHUF}
                  onRefresh={onRefresh}
                  onSelect={() => setSelectedMember(member)}
                />
              ))}
            </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AddFamilyMemberModal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        familyGroupId={group.id}
        isHUF={isHUF}
        onRefresh={onRefresh}
      />

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          groupId={group.id}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Member Card ─────────────────────────────────────────────────────────────

function FamilyMemberCard({ member, groupId, isHUF, onRefresh, onSelect }: any) {
  const lifeStage = member.lifeStage ? LIFE_STAGE_CONFIG[member.lifeStage as keyof typeof LIFE_STAGE_CONFIG] : null;
  const dependency = DEPENDENCY_CONFIG[member.dependencyType as keyof typeof DEPENDENCY_CONFIG];
  const newSuggestions = member.suggestions?.filter((s: any) => s.status === "NEW").length || 0;
  const isLinked = !!member.linkedClientId;

  return (
    <div
      className="rounded-xl border border-border bg-card/80 p-4 hover:shadow-card-hover transition-all cursor-pointer group"
      onClick={onSelect}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold flex-shrink-0",
            generateAvatarColor(member.id)
          )}>
            {getInitials(member.fullName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{member.fullName}</p>
              {member.isHeadOfFamily && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
              {isLinked && <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
            </div>
            <p className="text-2xs text-muted-foreground">
              {member.relationship.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        {newSuggestions > 0 && (
          <span className="text-2xs bg-brand-500/15 text-brand-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
            {newSuggestions} tips
          </span>
        )}
      </div>

      {/* Life stage */}
      {lifeStage && (
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg mb-2.5", lifeStage.bg)}>
          <span className="text-sm">{lifeStage.emoji}</span>
          <span className={cn("text-2xs font-medium", lifeStage.color)}>{lifeStage.label}</span>
        </div>
      )}

      {/* Details */}
      <div className="space-y-1">
        {member.dob && (
          <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
            <Cake className="h-3 w-3" />
            {formatDate(member.dob, "medium")}
            {(() => {
              const age = Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 86400000));
              return <span className="text-muted-foreground/60">({age}y)</span>;
            })()}
          </p>
        )}
        {member.occupation && (
          <p className="text-2xs text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="h-3 w-3" />
            {member.occupation}
          </p>
        )}
        {isHUF && (
          <p className={cn("text-2xs font-medium", member.isHufCoparcener ? "text-violet-400" : "text-muted-foreground")}>
            {member.isHufCoparcener ? "✓ Coparcener" : "Not a coparcener"}
          </p>
        )}
      </div>

      {/* Dependency */}
      <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center justify-between">
        <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full", dependency?.bg, dependency?.color)}>
          {dependency?.label}
        </span>
        {member.communicationConsent && (
          <span className="text-2xs text-emerald-400">📱 Consented</span>
        )}
      </div>
    </div>
  );
}

// ─── Member Detail Modal ─────────────────────────────────────────────────────

function MemberDetailModal({ member, groupId, open, onClose, onRefresh }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "suggestions">("details");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customSugOpen, setCustomSugOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const lifeStage = member.lifeStage ? LIFE_STAGE_CONFIG[member.lifeStage as keyof typeof LIFE_STAGE_CONFIG] : null;

  const handleConvertToLead = async () => {
    const result = await convertMemberToLead(member.id);
    if (result.success) {
      toast.success(`${member.fullName} added as a lead!`);
      onClose();
      onRefresh();
    } else toast.error(result.error || "Failed");
  };

  const handleConvertToClient = async () => {
    if (!confirm(`Create standalone client profile for ${member.fullName}?`)) return;
    const result = await convertMemberToClient(member.id);
    if (result.success) {
      toast.success(`${member.fullName} is now a standalone client!`);
      onClose();
      onRefresh();
    } else toast.error(result.error || "Failed");
  };

  const handleMarriage = async () => {
    if (!confirm(`Trigger marriage event for ${member.fullName}? This will create a new family group and in-law lead.`)) return;
    const result = await triggerMarriageEvent(member.id);
    if (result.success) {
      toast.success("New family group and in-law lead created!");
      onClose();
      onRefresh();
    } else toast.error(result.error || "Failed");
  };

  const handleSuggestionStatus = async (suggestionId: string, status: string) => {
    const result = await updateSuggestionStatus(suggestionId, status);
    if (result.success) { toast.success("Updated"); onRefresh(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold", generateAvatarColor(member.id))}>
              {getInitials(member.fullName)}
            </div>
            <div>
              <DialogTitle className="text-base">{member.fullName}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{member.relationship.replace(/_/g, " ")}</span>
                {lifeStage && (
                  <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full", lifeStage.bg, lifeStage.color)}>
                    {lifeStage.emoji} {lifeStage.label}
                  </span>
                )}
                {member.linkedClientId && (
                  <span className="text-2xs bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">Standalone Client</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["details", "suggestions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-xs font-medium capitalize transition-colors",
                activeTab === tab
                  ? "text-brand-400 border-b-2 border-brand-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "suggestions" && member.suggestions?.length > 0 && (
                <span className="ml-1.5 text-2xs bg-brand-500/15 text-brand-400 px-1 rounded-full">
                  {member.suggestions.filter((s: any) => s.status === "NEW").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" && (
            <div className="p-4 space-y-4">
              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                {member.phone && (
                  <div>
                    <p className="text-2xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{member.phone}</p>
                  </div>
                )}
                {member.email && (
                  <div>
                    <p className="text-2xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{member.email}</p>
                  </div>
                )}
                {member.dob && (
                  <div>
                    <p className="text-2xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium">{formatDate(member.dob, "medium")}</p>
                  </div>
                )}
                {member.occupation && (
                  <div>
                    <p className="text-2xs text-muted-foreground">Occupation</p>
                    <p className="text-sm font-medium">{member.occupation}</p>
                  </div>
                )}
                {member.education && (
                  <div>
                    <p className="text-2xs text-muted-foreground">Education</p>
                    <p className="text-sm font-medium">{member.education}</p>
                  </div>
                )}
                <div>
                  <p className="text-2xs text-muted-foreground">Dependency</p>
                  <p className="text-sm font-medium">{member.dependencyType}</p>
                </div>
              </div>

              {member.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-2xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-foreground">{member.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>

                {!member.linkedClientId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-start gap-2 h-9"
                      onClick={handleConvertToLead}
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                      Convert to Lead
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-start gap-2 h-9"
                      onClick={handleConvertToClient}
                    >
                      <UserPlus className="h-3.5 w-3.5 text-brand-400" />
                      Create Standalone Client Profile
                    </Button>
                  </>
                )}

                {member.linkedClientId && (
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9" asChild>
                    <a href={`/clients/${member.linkedClientId}`}>
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                      View Client Profile
                    </a>
                  </Button>
                )}

                {(member.relationship === "CHILD" || member.relationship === "SIBLING") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs justify-start gap-2 h-9"
                    onClick={handleMarriage}
                  >
                    <Heart className="h-3.5 w-3.5 text-pink-400" />
                    Trigger Marriage Event → New Family
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs justify-start gap-2 h-9"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Edit Member
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs justify-start gap-2 h-9 text-danger hover:text-danger border-danger/20 hover:border-danger/40"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Member
                </Button>
              </div>
            </div>
          )}

          {activeTab === "suggestions" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {member.suggestions?.length || 0} suggestions based on life stage
                </p>
                <Button size="sm" variant="outline" className="h-7 text-2xs gap-1" onClick={() => setCustomSugOpen(true)}>
                  <Plus className="h-3 w-3" /> Custom
                </Button>
              </div>

              {!member.lifeStage && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-400">⚡ Set a life stage to get relevant financial product suggestions</p>
                </div>
              )}

              {member.suggestions?.length === 0 && (
                <div className="text-center py-8">
                  <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No suggestions yet</p>
                </div>
              )}

              {member.suggestions?.map((sug: any) => {
                const statusCfg = SUGGESTION_STATUS_CONFIG[sug.status as keyof typeof SUGGESTION_STATUS_CONFIG];
                return (
                  <div key={sug.id} className={cn("rounded-xl border p-4", statusCfg.border)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {sug.isCustom ? sug.customTitle : sug.template?.productName}
                        </p>
                        <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full", statusCfg.bg, statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      {!sug.isCustom && sug.template?.category && (
                        <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {sug.template.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {sug.isCustom ? sug.customDesc : sug.template?.description}
                    </p>
                    {/* Status actions */}
                    <div className="flex flex-wrap gap-1.5">
                      {["DISCUSSED", "IN_PROGRESS", "COMPLETED", "NOT_INTERESTED"].map((s) => (
                        sug.status !== s && (
                          <button
                            key={s}
                            onClick={() => handleSuggestionStatus(sug.id, s)}
                            className="text-2xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-brand-500/40 transition-colors"
                          >
                            → {SUGGESTION_STATUS_CONFIG[s as keyof typeof SUGGESTION_STATUS_CONFIG].label}
                          </button>
                        )
                      ))}
                    </div>
                    {sug.advisorNote && (
                      <p className="text-2xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                        Note: {sug.advisorNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Modal */}
        {deleteOpen && (
          <DeleteMemberModal
            member={member}
            groupId={groupId}
            onClose={() => setDeleteOpen(false)}
            onRefresh={onRefresh}
            onDone={onClose}
          />
        )}

        {/* Custom Suggestion Modal */}
        {customSugOpen && (
          <CustomSuggestionModal
            memberId={member.id}
            onClose={() => setCustomSugOpen(false)}
            onRefresh={onRefresh}
          />
        )}

        {/* Edit Modal */}
        {editOpen && (
          <EditMemberModal
            member={member}
            onClose={() => setEditOpen(false)}
            onRefresh={onRefresh}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Family Group Modal ────────────────────────────────────────────────

function CreateFamilyGroupModal({ open, onClose, clientId }: any) {
  const router = useRouter();
  const [groupType, setGroupType] = useState<"REGULAR" | "HUF">("REGULAR");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Record<string,any>>();

  const onSubmit = async (data: any) => {
    const result = await createFamilyGroup({
      ...data,
      groupType,
      headClientId: clientId,
    });
    if (result.success) {
      toast.success("Family group created!");
      reset();
      onClose();
      router.refresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Family Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-3">
            {(["REGULAR", "HUF"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setGroupType(type)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                  groupType === type
                    ? type === "HUF" ? "border-violet-500 bg-violet-500/10" : "border-brand-500 bg-brand-500/10"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                {type === "HUF" ? (
                  <Crown className={cn("h-5 w-5", groupType === "HUF" ? "text-violet-400" : "text-muted-foreground")} />
                ) : (
                  <Users className={cn("h-5 w-5", groupType === "REGULAR" ? "text-brand-400" : "text-muted-foreground")} />
                )}
                <span className={cn("text-xs font-semibold", groupType === type ? (type === "HUF" ? "text-violet-400" : "text-brand-400") : "text-muted-foreground")}>
                  {type === "HUF" ? "HUF Entity" : "Regular Family"}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Group Name *</Label>
            <Input placeholder={groupType === "HUF" ? "Sharma HUF" : "Sharma Family"} {...register("name", { required: true })} />
          </div>

          {groupType === "HUF" && (
            <>
              <div className="space-y-1.5">
                <Label>Karta Name</Label>
                <Input placeholder="Rajesh Kumar Sharma" {...register("kartaName")} />
              </div>
              <div className="space-y-1.5">
                <Label>HUF PAN</Label>
                <Input placeholder="ABCRS1234H" className="uppercase" {...register("hufPan")} />
              </div>
              <div className="space-y-1.5">
                <Label>HUF Bank Details</Label>
                <Input placeholder="Bank name, account no." {...register("hufBankDetails")} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Any notes about this family group..." className="resize-none min-h-[60px] text-sm" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddFamilyMemberModal({ open, onClose, familyGroupId, isHUF, onRefresh, ownerId }: any) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [linking, setLinking] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { dependencyType: "INDEPENDENT", isHufCoparcener: false, communicationConsent: false, isHeadOfFamily: false },
  });

  const searchClients = async (q: string) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.clients || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleLink = async () => {
    if (!selectedClient || !relationship) { toast.error("Select a client and relationship"); return; }
    setLinking(true);
    const result = await linkExistingClientToFamily(familyGroupId, selectedClient.id, relationship);
    setLinking(false);
    if (result.success) {
      toast.success(`${selectedClient.fullName} added to family!`);
      setSelectedClient(null); setSearchQuery(""); setRelationship("");
      onClose(); onRefresh();
    } else toast.error(result.error || "Failed");
  };

  const onSubmit = async (data: any) => {
    const result = await createFamilyMember(familyGroupId, data);
    if (result.success) {
      toast.success("Member added!");
      reset();
      onClose();
      onRefresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button type="button" onClick={() => setMode("existing")}
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", mode === "existing" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            Link Existing Client
          </button>
          <button type="button" onClick={() => setMode("new")}
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", mode === "new" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            Add New Member
          </button>
        </div>

        {mode === "existing" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search Client</Label>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); searchClients(e.target.value); }}
                  placeholder="Search by name, PAN, phone..."
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"
                />
                {searching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {searchResults.length > 0 && !selectedClient && (
                <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {searchResults.map((c: any) => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedClient(c); setSearchQuery(c.fullName); setSearchResults([]); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left border-b border-border last:border-0">
                      <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                        {c.fullName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">{c.pan || c.phone || c.city}</p>
                      </div>
                      {c.aum && <span className="text-xs text-brand-400 font-medium">₹{(Number(c.aum)/10000000).toFixed(2)}Cr</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedClient && (
                <div className="flex items-center gap-2 p-2 bg-brand-500/5 border border-brand-500/20 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
                    {selectedClient.fullName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{selectedClient.fullName}</p>
                    {selectedClient.aum && <p className="text-xs text-brand-400">AUM: ₹{(Number(selectedClient.aum)/10000000).toFixed(2)}Cr</p>}
                  </div>
                  <button type="button" onClick={() => { setSelectedClient(null); setSearchQuery(""); }} className="text-muted-foreground hover:text-danger">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Relationship *</Label>
              <Select onValueChange={setRelationship}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={handleLink} disabled={linking || !selectedClient || !relationship} className="bg-brand-500 hover:bg-brand-600 text-white">
                {linking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Link to Family
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Relationship *</Label>
              <Select onValueChange={(v) => setValue("relationship", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Sunita Sharma" {...register("fullName", { required: true })} />
            </div>

            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" {...register("dob")} />
            </div>

            <div className="space-y-1.5">
              <Label>Life Stage</Label>
              <Select onValueChange={(v) => setValue("lifeStage", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LIFE_STAGE_CONFIG).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>
                      {cfg.emoji} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" {...register("phone")} />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="sunita@example.com" {...register("email")} />
            </div>

            <div className="space-y-1.5">
              <Label>Occupation</Label>
              <Input placeholder="Interior Designer" {...register("occupation")} />
            </div>

            <div className="space-y-1.5">
              <Label>Education</Label>
              <Input placeholder="B.Arch, Mumbai University" {...register("education")} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Dependency Type</Label>
              <Select defaultValue="INDEPENDENT" onValueChange={(v) => setValue("dependencyType", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPENDENCY_CONFIG).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {[
              { key: "isHeadOfFamily", label: "Head of Family", desc: "Mark as head/primary member" },
              { key: "communicationConsent", label: "Communication Consent", desc: "Allow MessageSquare/email campaigns" },
              ...(isHUF ? [{ key: "isHufCoparcener", label: "HUF Coparcener", desc: "Include as coparcener in HUF" }] : []),
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                  <p className="text-xs text-muted-foreground">{toggle.desc}</p>
                </div>
                <Switch onCheckedChange={(v) => setValue(toggle.key as any, v)} />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Notes about this family member..." className="resize-none min-h-[60px] text-sm" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Member Modal ──────────────────────────────────────────────────────

function DeleteMemberModal({ member, groupId, onClose, onRefresh, onDone }: any) {
  const [action, setAction] = useState<"REMOVE" | "MOVE">("REMOVE");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteFamilyMember(member.id, action);
    if (result.success) {
      toast.success(action === "REMOVE" ? "Member removed" : "Member moved");
      onClose();
      onDone();
      onRefresh();
    } else toast.error(result.error || "Failed");
    setDeleting(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove {member.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">What would you like to do with this member?</p>
          {[
            { value: "REMOVE", label: "Remove entirely", desc: "Delete from all family groups" },
            { value: "MOVE", label: "Move to another group", desc: "Preserve record, change group" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAction(opt.value as any)}
              className={cn(
                "w-full text-left p-3 rounded-lg border-2 transition-colors",
                action === opt.value ? "border-brand-500 bg-brand-500/10" : "border-border hover:border-muted-foreground/30"
              )}
            >
              <p className="text-sm font-medium text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className={action === "REMOVE" ? "bg-danger hover:bg-danger/80 text-white" : "bg-brand-500 hover:bg-brand-600 text-white"}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {action === "REMOVE" ? "Remove Member" : "Move Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Member Modal ────────────────────────────────────────────────────────

function EditMemberModal({ member, onClose, onRefresh }: any) {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: {
      fullName: member.fullName,
      phone: member.phone || "",
      email: member.email || "",
      occupation: member.occupation || "",
      education: member.education || "",
      notes: member.notes || "",
      dependencyType: member.dependencyType,
      isHufCoparcener: member.isHufCoparcener,
      isHeadOfFamily: member.isHeadOfFamily,
      communicationConsent: member.communicationConsent,
      dob: member.dob ? new Date(member.dob).toISOString().split("T")[0] : "",
    },
  });

  const onSubmit = async (data: any) => {
    const result = await updateFamilyMember(member.id, data);
    if (result.success) {
      toast.success("Member updated");
      onClose();
      onRefresh();
    } else toast.error(result.error || "Failed");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {member.fullName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input {...register("fullName", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" {...register("dob")} />
            </div>
            <div className="space-y-1.5">
              <Label>Life Stage</Label>
              <Select defaultValue={member.lifeStage || ""} onValueChange={(v) => setValue("lifeStage", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LIFE_STAGE_CONFIG).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.emoji} {cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Occupation</Label>
              <Input {...register("occupation")} />
            </div>
            <div className="space-y-1.5">
              <Label>Education</Label>
              <Input {...register("education")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea className="resize-none min-h-[60px] text-sm" {...register("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Custom Suggestion Modal ──────────────────────────────────────────────────

function CustomSuggestionModal({ memberId, onClose, onRefresh }: any) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Record<string,any>>();

  const onSubmit = async (data: any) => {
    const result = await addCustomSuggestion(memberId, data);
    if (result.success) {
      toast.success("Suggestion added");
      onClose();
      onRefresh();
    } else toast.error("Failed");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Custom Suggestion</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product / Action Name *</Label>
            <Input placeholder="e.g. HDFC Life Click2Protect Term Plan" {...register("customTitle", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea
              placeholder="Why this is relevant for this member..."
              className="resize-none min-h-[80px] text-sm"
              {...register("customDesc", { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Advisor Note</Label>
            <Textarea
              placeholder="Internal note for yourself..."
              className="resize-none min-h-[60px] text-sm"
              {...register("advisorNote")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Suggestion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
