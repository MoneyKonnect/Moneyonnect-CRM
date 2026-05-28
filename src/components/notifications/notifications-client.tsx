"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, Activity, Bell, CheckCheck, Cake, IndianRupee, FileWarning, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { markAlertRead, markAlertActioned, markAllAlertsRead, deleteAlert, deleteAllReadAlerts } from "@/actions/intelligence";
import { toast } from "sonner";

const ALERT_TYPE_CONFIG: Record<string, any> = {
  BIRTHDAY:           { icon: Cake,         color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20",    action: "Send wishes"     },
  AGE_18:             { icon: TrendingUp,    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", action: "Convert to lead" },
  INVESTMENT_MATURITY:{ icon: IndianRupee,   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   action: "Schedule call"   },
  KYC_EXPIRY:         { icon: FileWarning,   color: "text-danger",      bg: "bg-danger/10",      border: "border-danger/20",      action: "Take action"     },
  LIFE_STAGE_CHANGE:  { icon: Activity,      color: "text-brand-400",   bg: "bg-brand-500/10",   border: "border-brand-500/20",   action: "View suggestions"},
};

export function NotificationsClient({ alerts }: { alerts: any[] }) {
  const router = useRouter();
  const [readIds, setReadIds]       = useState<Set<string>>(new Set(alerts.filter(a => a.isRead).map((a: any) => a.id)));
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set(alerts.filter(a => a.isActioned).map((a: any) => a.id)));
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const markRead = async (id: string) => {
    setReadIds(prev => new Set([...prev, id]));
    await markAlertRead(id);
  };

  const handleAction = async (id: string) => {
    setActionedIds(prev => new Set([...prev, id]));
    setReadIds(prev => new Set([...prev, id]));
    await markAlertActioned(id);
    toast.success("Marked as actioned");
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletedIds(prev => new Set([...prev, id]));
    await deleteAlert(id);
  };

  const handleMarkAllRead = async () => {
    setReadIds(new Set(alerts.map((a: any) => a.id)));
    await markAllAlertsRead();
    toast.success("All marked as read");
    router.refresh();
  };

  const handleDeleteRead = async () => {
    const readAlerts = alerts.filter(a => readIds.has(a.id) || a.isRead);
    readAlerts.forEach(a => setDeletedIds(prev => new Set([...prev, a.id])));
    await deleteAllReadAlerts();
    toast.success("Read notifications cleared");
    router.refresh();
  };

  const visibleAlerts = alerts.filter(a => !deletedIds.has(a.id));
  const unreadCount = visibleAlerts.filter(a => !readIds.has(a.id)).length;
  const readCount = visibleAlerts.filter(a => readIds.has(a.id) || a.isRead).length;

  // Group by type
  const grouped = visibleAlerts.reduce((acc: any, alert: any) => {
    if (!acc[alert.alertType]) acc[alert.alertType] = [];
    acc[alert.alertType].push(alert);
    return acc;
  }, {});

  const typeOrder = ["BIRTHDAY","AGE_18","INVESTMENT_MATURITY","KYC_EXPIRY","LIFE_STAGE_CHANGE"];
  const typeLabels: Record<string, string> = {
    BIRTHDAY:            "🎂 Birthdays",
    AGE_18:              "🎓 Turning 18",
    INVESTMENT_MATURITY: "💰 Investment Maturity",
    KYC_EXPIRY:          "📄 KYC & Follow-up Alerts",
    LIFE_STAGE_CHANGE:   "⚡ Life Stage Changes",
  };

  if (visibleAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <h3 className="font-medium text-foreground mb-1">All caught up!</h3>
        <p className="text-sm text-muted-foreground">No notifications to show.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{unreadCount} unread · {visibleAlerts.length} total</span>
        <div className="flex items-center gap-2">
          {readCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-danger hover:text-danger gap-1" onClick={handleDeleteRead}>
              <Trash2 className="h-3.5 w-3.5" /> Clear read ({readCount})
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Grouped alerts */}
      {typeOrder.map(type => {
        const typeAlerts = grouped[type];
        if (!typeAlerts || typeAlerts.length === 0) return null;
        const cfg = ALERT_TYPE_CONFIG[type] || ALERT_TYPE_CONFIG.KYC_EXPIRY;
        const Icon = cfg.icon;

        return (
          <div key={type} className="space-y-2">
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              {typeLabels[type]}
              <span className="text-2xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full normal-case font-normal">{typeAlerts.length}</span>
            </p>
            {typeAlerts.map((alert: any) => {
              const isRead = readIds.has(alert.id) || alert.isRead;
              const isActioned = actionedIds.has(alert.id) || alert.isActioned;

              return (
                <div
                  key={alert.id}
                  onClick={() => markRead(alert.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-card cursor-pointer group",
                    isActioned ? "border-border bg-card opacity-50" : isRead ? "border-border bg-card" : cn("bg-card", cfg.border)
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium leading-snug", isRead ? "text-muted-foreground" : "text-foreground")}>
                        {alert.title}
                        {!isRead && !isActioned && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-brand-400 align-middle" />}
                      </p>
                      <span className="text-2xs text-muted-foreground flex-shrink-0">
                        {alert.dueDate ? formatDate(alert.dueDate, "short") : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.body}</p>
                    {!isActioned && (
                      <div className="flex items-center gap-3 mt-2">
                        {alert.clientId && (
                          <Link href={`/clients/${alert.clientId}`} onClick={e => e.stopPropagation()}
                            className={cn("text-2xs font-medium transition-colors hover:opacity-80", cfg.color)}>
                            {cfg.action} →
                          </Link>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleAction(alert.id); }}
                          className="text-2xs text-muted-foreground hover:text-foreground transition-colors">
                          Mark actioned
                        </button>
                      </div>
                    )}
                    {isActioned && <p className="text-2xs text-muted-foreground mt-1">✓ Actioned</p>}
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(alert.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-danger p-1 rounded flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
