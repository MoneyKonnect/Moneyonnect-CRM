"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, ExternalLink, Globe, Copy, Check } from "lucide-react";
import { MeetingSchedulerModal } from "@/components/leads/meeting-scheduler-modal";
import { toast } from "sonner";

const CALENDLY_LINK = "https://calendly.com/moneykonnect-info/30min";

export default function MeetingSetupClient({ leads }: { leads: any[] }) {
  const router = useRouter();
  const [webinarOpen, setWebinarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(CALENDLY_LINK);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meeting Set-Up</h1>
        <p className="text-muted-foreground mt-1">Schedule 1-on-1 meetings or group webinars with your leads</p>
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
              <p className="text-xs text-muted-foreground">Personal consultation via Calendly</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Share your Calendly link with leads so they can book a time that works for them.
          </p>
          <a
            href={CALENDLY_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Calendly Booking Page
          </a>
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between gap-2">
            <p className="text-xs text-brand-400 break-all flex-1">{CALENDLY_LINK}</p>
            <button onClick={copyLink} className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
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
            <Globe className="h-4 w-4" />
            Schedule Group Webinar
          </button>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Supports: Google Meet, Zoom, Phone Call, In Person</p>
            <p className="text-xs text-muted-foreground mt-1">{leads.length} active lead{leads.length !== 1 ? "s" : ""} available to invite</p>
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
        />
      )}
    </div>
  );
}
