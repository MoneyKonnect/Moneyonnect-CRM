"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Zap,
  MessageSquare,
  FileWarning,
  TrendingUp,
  Globe,
  RefreshCw,
  Plus,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AUTOMATION_CATALOG = [
  {
    id: "birthday_whatsapp",
    name: "Birthday Reminder",
    description: "Auto-send MessageSquare greeting on client birthdays",
    tag: "MessageSquare",
    tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: MessageSquare,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    defaultEnabled: false,
    trigger: "Birthday date match",
    action: "Send MessageSquare template message",
  },
  {
    id: "kyc_expiry_alert",
    name: "KYC Expiry Alert",
    description: "Alert advisor 30 days before KYC documents expire",
    tag: "Task",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: FileWarning,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    defaultEnabled: false,
    trigger: "30 days before document expiry",
    action: "Create urgent task + send notification",
  },
  {
    id: "investment_maturity",
    name: "Investment Maturity Reminder",
    description: "Create task 45 days before investment matures",
    tag: "Task",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: RefreshCw,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    defaultEnabled: false,
    trigger: "45 days before maturity date",
    action: "Create follow-up task",
  },
  {
    id: "lead_followup_sequence",
    name: "Lead Follow-up Sequence",
    description: "Auto-schedule follow-up tasks for new leads",
    tag: "Leads",
    tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: TrendingUp,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    defaultEnabled: false,
    trigger: "New lead created",
    action: "Schedule Day 1, Day 3, Day 7 follow-ups",
  },
  {
    id: "nri_compliance",
    name: "NRI Compliance Check",
    description: "Annual reminder to verify FATCA status for NRI clients",
    tag: "Compliance",
    tagColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    icon: Globe,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    defaultEnabled: false,
    trigger: "Annually (every 365 days)",
    action: "Create compliance task for each NRI client",
  },
  {
    id: "portfolio_review",
    name: "Portfolio Review Prompt",
    description: "Quarterly reminder to schedule portfolio review calls",
    tag: "Task",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: RefreshCw,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    defaultEnabled: false,
    trigger: "Every 90 days per client",
    action: "Create portfolio review task",
  },
  {
    id: "age_18_alert",
    name: "Age-18 Conversion Alert",
    description: "Alert when a family member turns 18 — suggest converting to lead",
    tag: "Family",
    tagColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    icon: Zap,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/10",
    defaultEnabled: true,
    trigger: "Family member turns 18 within 90 days",
    action: "Send notification with convert-to-lead option",
  },
  {
    id: "dormant_lead_alert",
    name: "Dormant Lead Alert",
    description: "Alert when a lead has no activity for 14+ days",
    tag: "Leads",
    tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: TrendingUp,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    defaultEnabled: true,
    trigger: "No lead activity for 14 days",
    action: "Create smart alert + notify advisor",
  },
];

export function AutomationsClient() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATION_CATALOG.map(a => [a.id, a.defaultEnabled]))
  );

  const handleToggle = (id: string, value: boolean) => {
    setEnabled(prev => ({ ...prev, [id]: value }));
    toast.success(value ? "Automation enabled" : "Automation disabled", {
      description: AUTOMATION_CATALOG.find(a => a.id === id)?.name,
    });
  };

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Automations</h1>
            <p className="text-sm text-muted-foreground">
              {enabledCount} active · {AUTOMATION_CATALOG.length - enabledCount} disabled
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Custom Rule
        </Button>
      </div>

      {/* Status banner */}
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 flex items-start gap-3">
        <Zap className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Smart Alert Engine is active</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Birthday alerts, age-18 detection, investment maturity, and overdue follow-ups run automatically on every dashboard visit. Toggle individual rules below.
          </p>
        </div>
      </div>

      {/* Automation cards */}
      <div className="space-y-3">
        {AUTOMATION_CATALOG.map(automation => {
          const Icon = automation.icon;
          const isEnabled = enabled[automation.id];
          return (
            <div
              key={automation.id}
              className={cn(
                "rounded-xl border bg-card p-5 transition-all",
                isEnabled ? "border-brand-500/20 shadow-card" : "border-border"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", automation.iconBg)}>
                  <Icon className={cn("h-4.5 w-4.5", automation.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{automation.name}</p>
                    <span className={cn("text-2xs font-medium px-1.5 py-0.5 rounded-full border", automation.tagColor)}>
                      {automation.tag}
                    </span>
                    {isEnabled && (
                      <span className="text-2xs bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{automation.description}</p>
                  {isEnabled && (
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      <span className="text-2xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Trigger:</span> {automation.trigger}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Action:</span> {automation.action}
                      </span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={v => handleToggle(automation.id, v)}
                  className="flex-shrink-0 mt-0.5"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">More automations coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">MessageSquare Business API integration, email sequences, and custom rule builder</p>
      </div>
    </div>
  );
}
