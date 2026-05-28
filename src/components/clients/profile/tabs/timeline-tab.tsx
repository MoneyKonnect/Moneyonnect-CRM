"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  Video,
  Plus,
  Loader2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { createInteraction } from "@/actions/interactions";

const CHANNEL_CONFIG = {
  PHONE:     { icon: Phone,        label: "Phone Call",   color: "text-blue-400",    bg: "bg-blue-500/10"    },
  EMAIL:     { icon: Mail,         label: "Email",        color: "text-violet-400",  bg: "bg-violet-500/10"  },
  WHATSAPP:  { icon: MessageSquare,label: "MessageSquare",     color: "text-emerald-400", bg: "bg-emerald-500/10" },
  IN_PERSON: { icon: Users,        label: "In Person",    color: "text-amber-400",   bg: "bg-amber-500/10"   },
  VIDEO_CALL:{ icon: Video,        label: "Video Call",   color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
  SMS:       { icon: MessageSquare,label: "SMS",          color: "text-pink-400",    bg: "bg-pink-500/10"    },
};

interface TimelineTabProps { client: any; }

export function TimelineTab({ client }: TimelineTabProps) {
  const router = useRouter();
  const [channel, setChannel] = useState<string>("PHONE");
  const [direction, setDirection] = useState<"INBOUND" | "OUTBOUND">("OUTBOUND");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleLog = async () => {
    if (!summary.trim()) return;
    setSaving(true);
    const result = await createInteraction(client.id, {
      channel: channel as any,
      direction,
      summary: summary.trim(),
    });
    if (result.success) {
      toast.success("Interaction logged!");
      setSummary("");
      setShowForm(false);
      router.refresh();
    } else toast.error(result.error || "Failed to log");
    setSaving(false);
  };

  const interactions = client.interactions || [];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Log interaction button / form */}
      {!showForm ? (
        <Button
          size="sm"
          className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Log Interaction
        </Button>
      ) : (
        <div className="rounded-xl border border-brand-500/20 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Log Interaction</p>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
          </div>

          {/* Channel selector */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setChannel(key)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                      channel === key
                        ? `border-brand-500 ${cfg.bg} ${cfg.color}`
                        : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-2xs font-medium leading-tight text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direction */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {direction === "OUTBOUND" ? "Outbound (you reached out)" : "Inbound (they reached out)"}
              </p>
              <p className="text-xs text-muted-foreground">Toggle to change direction</p>
            </div>
            <Switch
              checked={direction === "INBOUND"}
              onCheckedChange={v => setDirection(v ? "INBOUND" : "OUTBOUND")}
            />
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <Label>Summary *</Label>
            <Textarea
              placeholder="What was discussed? Key points, decisions, follow-ups required…"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className="min-h-[90px] resize-none text-sm"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleLog(); }}
            />
            <p className="text-2xs text-muted-foreground">⌘ + Enter to save</p>
          </div>

          <Button
            className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
            size="sm"
            onClick={handleLog}
            disabled={!summary.trim() || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            {saving ? "Saving…" : "Log Interaction"}
          </Button>
        </div>
      )}

      {/* Timeline */}
      {interactions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No interactions logged yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Log calls, meetings, emails — build a complete history</p>
        </div>
      ) : (
        <div className="relative space-y-3">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

          {interactions.map((interaction: any, idx: number) => {
            const cfg = CHANNEL_CONFIG[interaction.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.PHONE;
            const Icon = cfg.icon;
            const isInbound = interaction.direction === "INBOUND";

            return (
              <div key={interaction.id} className="flex gap-4 pl-2">
                {/* Icon */}
                <div className={cn(
                  "w-7 h-7 rounded-full border-2 border-background flex items-center justify-center flex-shrink-0 z-10 shadow-sm",
                  cfg.bg
                )}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3 hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                      <span className={cn(
                        "text-2xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                        isInbound
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-blue-500/10 text-blue-400"
                      )}>
                        {isInbound
                          ? <><ArrowDownLeft className="h-2.5 w-2.5" /> Inbound</>
                          : <><ArrowUpRight className="h-2.5 w-2.5" /> Outbound</>
                        }
                      </span>
                      {interaction.familyMember && (
                        <span className="text-2xs bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded-full">
                          with {interaction.familyMember.fullName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-2xs text-muted-foreground">
                        {formatDate(interaction.occurredAt, "relative")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{interaction.summary}</p>
                  {interaction.user?.name && (
                    <p className="text-2xs text-muted-foreground mt-1.5">— {interaction.user.name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
