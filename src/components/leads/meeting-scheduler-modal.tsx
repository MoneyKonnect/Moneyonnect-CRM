"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Calendar, Video, Phone, Users, Link, MessageSquare,
  Mail, Loader2, X, Globe, ChevronRight, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { scheduleMeeting, createWebinar } from "@/actions/webinars";

const PLATFORMS = [
  { id: "GOOGLE_MEET", label: "Google Meet",   icon: Video,  color: "text-blue-400"    },
  { id: "ZOOM",        label: "Zoom",           icon: Video,  color: "text-cyan-400"    },
  { id: "PHONE_CALL",  label: "Phone Call",     icon: Phone,  color: "text-emerald-400" },
  { id: "IN_PERSON",   label: "In Person",      icon: Users,  color: "text-amber-400"   },
];

const INTERESTS = [
  "Complimentary Portfolio Health Review",
  "NRI Wealth & Investment Planning",
  "International / Global Investing",
  "Tax Saving & Capital Gains Planning",
  "Retirement & Passive Income Planning",
  "Estate Planning / Trust / Will Structuring",
  "Real Estate Portfolio Evaluation",
  "PMS / AIF Investment Consultation",
  "Need a Second Opinion on Existing Investments",
  "Goal-Based Wealth Planning",
];

interface MeetingSchedulerModalProps {
  lead: any;
  allLeads?: any[];
  open: boolean;
  onClose: () => void;
  defaultMode?: "personal" | "webinar";
}

export function MeetingSchedulerModal({ lead, allLeads = [], open, onClose, defaultMode = "personal" }: MeetingSchedulerModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"personal" | "webinar">(defaultMode);
  const [platform, setPlatform] = useState("GOOGLE_MEET");
  const [saving, setSaving] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>(lead ? [lead.id] : []);
  const [filterResidency, setFilterResidency] = useState<"ALL" | "NRI" | "RESIDENT">("ALL");
  const [filterInterest, setFilterInterest] = useState("ALL");
  const [webinarTitle, setWebinarTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");

  const filteredLeads = allLeads.filter(l => {
    if (filterResidency === "NRI" && l.residencyType !== "NRI") return false;
    if (filterResidency === "RESIDENT" && l.residencyType === "NRI") return false;
    if (filterInterest !== "ALL" && l.interest !== filterInterest) return false;
    return true;
  });

  const toggleLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!scheduledAt) { toast.error("Please select date & time"); return; }
    setSaving(true);

    if (mode === "personal") {
      const result = await scheduleMeeting({
        leadId: lead.id,
        scheduledAt,
        platform,
        meetingLink: meetingLink || undefined,
        notes: notes || undefined,
        sendWhatsApp,
        sendEmail,
      });
      if (result.success) {
        toast.success("Meeting scheduled! ✅", {
          description: sendWhatsApp && lead.phone
            ? `Opening WhatsApp for ${lead.fullName}…`
            : undefined,
        });
        if (sendWhatsApp && lead.phone && meetingLink) {
          const phone = lead.phone.replace(/[^0-9]/g, "");
          const msg = encodeURIComponent(
            `Hi ${lead.fullName.split(" ")[0]}! 👋\n\nYour meeting with MoneyKonnect is confirmed.\n\n📅 Date: ${new Date(scheduledAt).toLocaleString("en-IN")}\n📹 Platform: ${platform.replace(/_/g, " ")}\n🔗 Link: ${meetingLink}\n\nLooking forward to speaking with you!`
          );
          window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
        }
        onClose();
        router.refresh();
      } else toast.error(result.error || "Failed");
    } else {
      if (!webinarTitle.trim()) { toast.error("Please enter webinar title"); setSaving(false); return; }
      if (selectedLeads.length === 0) { toast.error("Please select at least one lead"); setSaving(false); return; }

      const result = await createWebinar({
        title: webinarTitle,
        scheduledAt,
        platform,
        meetingLink: meetingLink || undefined,
        description: description || undefined,
        leadIds: selectedLeads,
      });
      if (result.success) {
        toast.success(`Webinar created! ${selectedLeads.length} leads invited ✅`);
        // Open WhatsApp for first lead as demo
        const firstLead = allLeads.find(l => selectedLeads.includes(l.id) && l.phone);
        if (sendWhatsApp && firstLead && meetingLink) {
          const phone = firstLead.phone.replace(/[^0-9]/g, "");
          const msg = encodeURIComponent(
            `Hi ${firstLead.fullName.split(" ")[0]}! 👋\n\nYou're invited to our webinar!\n\n📌 ${webinarTitle}\n📅 ${new Date(scheduledAt).toLocaleString("en-IN")}\n📹 ${platform.replace(/_/g, " ")}\n🔗 ${meetingLink}\n\n${description || ""}\n\nSee you there!`
          );
          window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
        }
        onClose();
        router.refresh();
      } else toast.error(result.error || "Failed");
    }
    setSaving(false);
  };

  // Get min datetime (now)
  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-brand-400" />
            Schedule {mode === "personal" ? "Meeting" : "Webinar"}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          {[
            { id: "personal", label: "1-on-1 Meeting", icon: Users },
            { id: "webinar",  label: "Group Webinar",  icon: Globe },
          ].map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id as any)}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                  mode === m.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{m.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 pt-1">
          {/* Webinar title */}
          {mode === "webinar" && (
            <div className="space-y-1.5">
              <Label>Webinar Title *</Label>
              <Input placeholder="e.g. NRI Investment Planning Masterclass"
                value={webinarTitle} onChange={e => setWebinarTitle(e.target.value)} />
            </div>
          )}

          {/* Lead name for personal */}
          {mode === "personal" && lead && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-500/5 border border-brand-500/20">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{lead.fullName}</p>
                <p className="text-xs text-muted-foreground">{lead.phone || lead.email}</p>
              </div>
            </div>
          )}

          {/* Date + Time */}
          <div className="space-y-1.5">
            <Label>Date & Time *</Label>
            <Input type="datetime-local" min={minDateTime}
              value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                return (
                  <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                    className={cn("flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center",
                      platform === p.id ? `border-brand-500 bg-brand-500/5 ${p.color}` : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    )}>
                    <Icon className="h-4 w-4" />
                    <span className="text-2xs font-medium leading-tight">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting link */}
          {platform !== "PHONE_CALL" && platform !== "IN_PERSON" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Link className="h-3.5 w-3.5" /> Meeting Link</Label>
              <Input placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx"
                value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
            </div>
          )}

          {/* Notes / Description */}
          <div className="space-y-1.5">
            <Label>{mode === "personal" ? "Notes" : "Agenda / Description"}</Label>
            <Textarea
              placeholder={mode === "personal" ? "Topics to discuss, follow-up context…" : "What will be covered in this webinar?"}
              className="min-h-[70px] resize-none text-sm"
              value={mode === "personal" ? notes : description}
              onChange={e => mode === "personal" ? setNotes(e.target.value) : setDescription(e.target.value)}
            />
          </div>

          {/* Delivery options */}
          {mode === "personal" && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">Send Invitation Via</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">WhatsApp{lead?.phone ? ` (${lead.phone})` : " (no phone)"}</span>
                </div>
                <Switch checked={sendWhatsApp && !!lead?.phone} onCheckedChange={setSendWhatsApp} disabled={!lead?.phone} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">Email{lead?.email ? ` (${lead.email})` : " (no email)"}</span>
                </div>
                <Switch checked={sendEmail && !!lead?.email} onCheckedChange={setSendEmail} disabled={!lead?.email} />
              </div>
            </div>
          )}

          {/* Lead selector for webinar */}
          {mode === "webinar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Leads ({selectedLeads.length} selected)</Label>
                <div className="flex gap-1">
                  {["ALL","NRI","RESIDENT"].map(f => (
                    <button key={f} onClick={() => setFilterResidency(f as any)}
                      className={cn("text-2xs px-2 py-1 rounded-md transition-colors",
                        filterResidency === f ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground hover:bg-accent"
                      )}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="max-h-[180px] overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                {filteredLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No leads match filter</p>
                ) : filteredLeads.map(l => {
                  const selected = selectedLeads.includes(l.id);
                  return (
                    <button key={l.id} onClick={() => toggleLead(l.id)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
                        selected ? "bg-brand-500/10 border border-brand-500/20" : "hover:bg-accent border border-transparent"
                      )}>
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors",
                        selected ? "bg-brand-500 border-brand-500" : "border-muted-foreground/40"
                      )}>
                        {selected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{l.fullName}</p>
                        <p className="text-2xs text-muted-foreground truncate">
                          {l.residencyType === "NRI" ? "🌍 NRI" : "🇮🇳 Resident"}{l.interest ? ` · ${l.interest.substring(0, 30)}…` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedLeads(filteredLeads.map(l => l.id))}
                  className="text-2xs text-brand-400 hover:text-brand-300 transition-colors">
                  Select all ({filteredLeads.length})
                </button>
                <span className="text-2xs text-muted-foreground">·</span>
                <button onClick={() => setSelectedLeads([])}
                  className="text-2xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              </div>
              {sendWhatsApp && selectedLeads.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <MessageSquare className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Will open WhatsApp for the first lead. Copy-paste to send to all {selectedLeads.length} leads manually.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
            onClick={handleSubmit}
            disabled={saving || !scheduledAt}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {saving ? "Scheduling…" : mode === "personal" ? "Schedule Meeting" : `Invite ${selectedLeads.length} Lead${selectedLeads.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
