"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Clock,
  FileEdit,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";
import { createCampaign, deleteCampaign, sendCampaign } from "@/actions/campaigns";
import { searchClients } from "@/actions/clients";

const CHANNEL_CONFIG = {
  WHATSAPP: { icon: MessageSquare, label: "MessageSquare", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  EMAIL: { icon: Mail, label: "Email", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  SMS: { icon: MessageSquare, label: "SMS", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", icon: FileEdit, class: "badge-muted" },
  SCHEDULED: { label: "Scheduled", icon: Clock, class: "badge-warning" },
  SENT: { label: "Sent", icon: CheckCircle2, class: "badge-success" },
  CANCELLED: { label: "Cancelled", icon: Clock, class: "badge-muted" },
};

const TEMPLATES = {
  WHATSAPP: [
    { name: "Portfolio Review", body: "Hi {name}! Your quarterly portfolio review is due. Let's schedule a call to discuss your investments. Reply YES to confirm." },
    { name: "Market Update", body: "Dear {name}, significant market movement this week. I'd like to share how this affects your portfolio. Can we connect?" },
    { name: "SIP Reminder", body: "Hi {name}! Quick reminder — your SIP of ₹{amount} is due on {date}. Please ensure sufficient balance. 🙏" },
    { name: "Birthday Wishes", body: "Dear {name}, wishing you a very Happy Birthday! 🎂 It's a great time to review your financial goals for the year ahead." },
  ],
  EMAIL: [
    { name: "Monthly Newsletter", body: "Dear {name},\n\nHope this finds you well. Here's your monthly wealth management update...\n\nRegards,\nYour Advisor" },
    { name: "Investment Opportunity", body: "Dear {name},\n\nI wanted to share an investment opportunity aligned with your risk profile...\n\nBest regards" },
  ],
  SMS: [
    { name: "Quick Reminder", body: "Hi {name}, reminder about our meeting on {date}. Reply to confirm. - Your Advisor" },
    { name: "KYC Alert", body: "Dear {name}, your KYC is due for renewal. Please call us at your earliest convenience." },
  ],
};

interface CampaignsClientProps { campaigns: any[]; }

export function CampaignsClient({ campaigns }: CampaignsClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"?`)) return;
    const result = await deleteCampaign(id);
    if (result.success) { toast.success("Campaign deleted"); router.refresh(); }
    else toast.error(result.error || "Failed");
  };

  const handleSend = async (id: string) => {
    if (!confirm("Send this campaign now to all recipients?")) return;
    const result = await sendCampaign(id);
    if (result.success) { toast.success("Campaign sent! 🚀"); router.refresh(); }
    else toast.error(result.error || "Failed");
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} total · {campaigns.filter(c => c.status === "DRAFT").length} draft · {campaigns.filter(c => c.status === "SENT").length} sent
            </p>
          </div>
        </div>
        <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5 shadow-glow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: campaigns.filter(c => c.status === "SENT").reduce((s, c) => s + c._count.recipients, 0), color: "text-emerald-400" },
          { label: "In Draft", value: campaigns.filter(c => c.status === "DRAFT").length, color: "text-amber-400" },
          { label: "Scheduled", value: campaigns.filter(c => c.status === "SCHEDULED").length, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-foreground mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Send personalized messages to your clients in bulk.</p>
          <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => setCreateOpen(true)}>
            Create first campaign
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Channel</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Recipients</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign) => {
                const channelCfg = CHANNEL_CONFIG[campaign.channel as keyof typeof CHANNEL_CONFIG];
                const statusCfg = STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG];
                const ChannelIcon = channelCfg?.icon || MessageSquare;
                const StatusIcon = statusCfg?.icon || Clock;
                return (
                  <tr key={campaign.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">{campaign.template.substring(0, 60)}…</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium", channelCfg?.color)}>
                        <ChannelIcon className="h-3.5 w-3.5" />{channelCfg?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-2xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit", statusCfg?.class)}>
                        <StatusIcon className="h-3 w-3" />{statusCfg?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />{campaign._count.recipients}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDate(campaign.createdAt, "medium")}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {campaign.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => handleSend(campaign.id)} className="text-emerald-400 focus:text-emerald-400">
                              <Send className="h-4 w-4 mr-2" /> Send Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(campaign.id, campaign.name)} className="text-danger focus:text-danger">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

// ─── Create Campaign Modal with recipient selection ──────────────────────────

function CreateCampaignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "SMS">("WHATSAPP");
  const [selectedClients, setSelectedClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { name: "", template: "", scheduledAt: "" },
  });

  const template = watch("template");

  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchClients(clientSearch);
      setClientResults(results.filter((r: any) => !selectedClients.find((s) => s.id === r.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const toggleClient = (client: any) => {
    setSelectedClients((prev) =>
      prev.find((c) => c.id === client.id)
        ? prev.filter((c) => c.id !== client.id)
        : [...prev, client]
    );
    setClientResults((prev) => prev.filter((c) => c.id !== client.id));
  };

  const removeClient = (clientId: string) => {
    setSelectedClients((prev) => prev.filter((c) => c.id !== clientId));
  };

  const onSubmit = async (data: any) => {
    const result = await createCampaign({
      name: data.name,
      channel,
      template: data.template,
      recipientIds: selectedClients.map((c) => c.id),
      scheduledAt: data.scheduledAt || undefined,
    });
    if (result.success) {
      toast.success("Campaign created!");
      reset();
      setSelectedClients([]);
      setClientSearch("");
      onClose();
      router.refresh();
    } else toast.error(result.error || "Failed to create campaign");
  };

  const channelTemplates = TEMPLATES[channel] || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campaign name */}
          <div className="space-y-1.5">
            <Label>Campaign Name *</Label>
            <Input placeholder="Q1 Portfolio Review" {...register("name", { required: true })} />
          </div>

          {/* Channel selector */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["WHATSAPP", "EMAIL", "SMS"] as const).map((ch) => {
                const cfg = CHANNEL_CONFIG[ch];
                const Icon = cfg.icon;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-xs font-medium",
                      channel === ch ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick templates */}
          {channelTemplates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Quick Templates</Label>
              <div className="flex gap-2 flex-wrap">
                {channelTemplates.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setValue("template", t.body)}
                    className="text-2xs px-2 py-1 rounded-full border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-brand-500/40 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template */}
          <div className="space-y-1.5">
            <Label>Message Template *</Label>
            <Textarea
              placeholder="Hi {name}, your portfolio review is due..."
              className="min-h-[90px] resize-none text-sm font-mono"
              {...register("template", { required: true })}
            />
            <p className="text-2xs text-muted-foreground">Variables: {"{name}"} {"{amount}"} {"{date}"}</p>
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <Label>Schedule (optional — leave blank to save as draft)</Label>
            <Input type="datetime-local" {...register("scheduledAt")} />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients ({selectedClients.length} selected)</Label>

            {/* Selected clients chips */}
            {selectedClients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/30">
                {selectedClients.map((client) => (
                  <div key={client.id} className="flex items-center gap-1 text-2xs bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">
                    {client.fullName}
                    <button type="button" onClick={() => removeClient(client.id)}>
                      <X className="h-3 w-3 hover:text-danger" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients by name…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {/* Search results */}
            {clientResults.length > 0 && (
              <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-40 overflow-y-auto">
                {clientResults.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => toggleClient(client)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{client.fullName}</p>
                      <p className="text-2xs text-muted-foreground">{client.phone || client.email || client.category}</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {selectedClients.length > 0 ? `Create with ${selectedClients.length} recipients` : "Save as Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
