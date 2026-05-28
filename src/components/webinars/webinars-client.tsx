"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Globe, Plus, Calendar, Link, Copy, Check, Trash2,
  Users, Clock, Video, Phone, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { deleteWebinar } from "@/actions/webinars";
import { MeetingSchedulerModal } from "@/components/leads/meeting-scheduler-modal";

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  GOOGLE_MEET: { label: "Google Meet", color: "text-blue-400"   },
  ZOOM:        { label: "Zoom",        color: "text-cyan-400"   },
  PHONE_CALL:  { label: "Phone Call",  color: "text-emerald-400"},
  IN_PERSON:   { label: "In Person",   color: "text-amber-400"  },
};

export function WebinarsClient({ webinars, leads }: { webinars: any[]; leads: any[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const now = new Date();
  const upcoming = webinars.filter(w => new Date(w.scheduledAt) > now);
  const past     = webinars.filter(w => new Date(w.scheduledAt) <= now);

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webinar?")) return;
    const result = await deleteWebinar(id);
    if (result.success) { toast.success("Webinar deleted"); router.refresh(); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Webinars</h1>
            <p className="text-sm text-muted-foreground">{upcoming.length} upcoming · {past.length} past</p>
          </div>
        </div>
        <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Schedule Webinar
        </Button>
      </div>

      {/* Webinar list */}
      {webinars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <h3 className="font-medium text-foreground mb-1">No webinars yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule your first group webinar or investor event</p>
          <Button size="sm" className="bg-brand-500 text-white" onClick={() => setCreateOpen(true)}>
            Schedule Webinar
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <WebinarSection title="Upcoming" webinars={upcoming} onDelete={handleDelete} onCopyLink={handleCopyLink} copiedId={copiedId} />
          )}
          {past.length > 0 && (
            <WebinarSection title="Past" webinars={past} onDelete={handleDelete} onCopyLink={handleCopyLink} copiedId={copiedId} past />
          )}
        </div>
      )}

      {createOpen && (
        <MeetingSchedulerModal
          lead={null}
          allLeads={leads}
          open={createOpen}
          onClose={() => { setCreateOpen(false); router.refresh(); }}
          defaultMode="webinar"
        />
      )}
    </div>
  );
}

function WebinarSection({ title, webinars, onDelete, onCopyLink, copiedId, past = false }: any) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {title}
        <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-normal normal-case">{webinars.length}</span>
      </h2>
      {webinars.map((w: any) => {
        const platformCfg = PLATFORM_CONFIG[w.platform] || { label: w.platform, color: "text-muted-foreground" };
        const attendees = w.invites?.length || 0;
        const isUpcoming = new Date(w.scheduledAt) > new Date();

        return (
          <div key={w.id} className={cn("rounded-xl border bg-card p-5 hover:shadow-card transition-shadow", past && "opacity-70")}>
            <div className="flex items-start gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                isUpcoming ? "bg-brand-500/10" : "bg-muted")}>
                <Globe className={cn("h-5 w-5", isUpcoming ? "text-brand-400" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{w.title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(w.scheduledAt, "medium")}
                      </span>
                      <span className={cn("text-xs flex items-center gap-1", platformCfg.color)}>
                        <Video className="h-3.5 w-3.5" />{platformCfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />{attendees} lead{attendees !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {w.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{w.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-2xs px-2 py-1 rounded-full font-medium",
                      isUpcoming ? "bg-brand-500/10 text-brand-400" : "bg-muted text-muted-foreground"
                    )}>
                      {isUpcoming ? "Upcoming" : "Done"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  {w.meetingLink && (
                    <button onClick={() => onCopyLink(w.meetingLink, w.id)}
                      className="text-2xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                      {copiedId === w.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === w.id ? "Copied!" : "Copy link"}
                    </button>
                  )}
                  {w.meetingLink && (
                    <a href={w.meetingLink} target="_blank" rel="noopener noreferrer"
                      className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <Link className="h-3 w-3" /> Open
                    </a>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => onDelete(w.id)}
                    className="text-2xs text-muted-foreground hover:text-danger transition-colors flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>

                {/* Attendees preview */}
                {w.invites?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.invites.slice(0, 8).map((inv: any) => (
                      <span key={inv.id} className="text-2xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {inv.lead?.fullName}
                      </span>
                    ))}
                    {w.invites.length > 8 && (
                      <span className="text-2xs text-muted-foreground">+{w.invites.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
