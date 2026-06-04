"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, ExternalLink, Copy, Check, Send } from "lucide-react";
import { MeetingSchedulerModal } from "@/components/leads/meeting-scheduler-modal";
import { toast } from "sonner";

const CALENDLY_LINK = "https://calendly.com/moneykonnect-info/30min";

export default function MeetingSetupClient({ leads }: { leads: any[] }) {
  const router = useRouter();
  const [webinarOpen, setWebinarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const copyLink = () => {
    navigator.clipboard.writeText(CALENDLY_LINK);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendCalendlyToLead = (lead: any) => {
    const msg = `Hi ${lead.fullName.split(" ")[0]}, I'd like to schedule a meeting with you. Please book a convenient time using this link: ${CALENDLY_LINK}`;
    const phone = lead.phone?.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success(`Calendly link sent to ${lead.fullName}!`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meeting Set-Up</h1>
        <p className="text-muted-foreground mt-1 text-sm">Schedule meetings and webinars with your leads</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1-on-1 Meeting */}
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">1-on-1 Meeting</h2>
              <p className="text-xs text-muted-foreground">Send Calendly link to a lead</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Select a lead and send them your Calendly booking link via WhatsApp — they pick their own time.
          </p>

          {/* Lead selector */}
          <div className="space-y-2">
            <select
              value={selectedLead?.id || ""}
              onChange={(e) => {
                const lead = leads.find(l => l.id === e.target.value);
                setSelectedLead(lead || null);
              }}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-foreground"
            >
              <option value="">Select a lead...</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.fullName} {l.phone ? `— ${l.phone}` : ""}</option>
              ))}
            </select>

            <button
              onClick={() => selectedLead && sendCalendlyToLead(selectedLead)}
              disabled={!selectedLead}
              className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              Send Calendly Link via WhatsApp
            </button>
          </div>

          {/* Calendly link */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Your booking link:</p>
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between gap-2">
              <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer"
                className="text-xs text-brand-400 break-all flex-1 hover:underline">
                {CALENDLY_LINK}
              </a>
              <button onClick={copyLink} className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-400 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" /> Open Calendly Dashboard
          </a>
        </div>

        {/* Group Webinar */}
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Group Webinar</h2>
              <p className="text-xs text-muted-foreground">Invite multiple leads to a session</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a webinar on Zoom or Google Meet, then blast the link to selected leads via WhatsApp.
          </p>
          <button
            onClick={() => setWebinarOpen(true)}
            className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Users className="h-4 w-4" />
            Schedule Group Webinar
          </button>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Supports: Google Meet, Zoom, Phone Call, In Person</p>
            <p className="text-xs text-muted-foreground">{leads.length} active lead{leads.length !== 1 ? "s" : ""} available to invite</p>
          </div>
        </div>
      </div>

      {webinarOpen && (
        <MeetingSchedulerModal
          lead={null}
          allLeads={leads}
          open={webinarOpen}
          onClose={() => { setWebinarOpen(false); router.refresh(); }}
          defaultMode="webinar"
          hidePersonalTab={true}
        />
      )}
    </div>
  );
}
