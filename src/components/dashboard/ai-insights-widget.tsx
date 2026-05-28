"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Users,
  IndianRupee,
  Calendar,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Insight {
  id: string;
  type: "opportunity" | "alert" | "trend";
  title: string;
  body: string;
  action: string;
  href: string;
  priority: "high" | "medium" | "low";
}

interface AiInsightsWidgetProps {
  insights?: Insight[];
  loading?: boolean;
}

export function AiInsightsWidget({ insights = [], loading = false }: AiInsightsWidgetProps) {
  const TYPE_CONFIG = {
    opportunity: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    alert: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/15" },
    trend: { icon: Sparkles, color: "text-brand-400", bg: "bg-brand-500/15" },
  };

  return (
    <div className="rounded-xl border-2 border-brand-500/20 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-500/10 bg-brand-500/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-500/20 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Insights</span>
          <span className="text-2xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full font-medium">Live</span>
        </div>
        {loading && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-full" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : insights.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No insights yet — add more client data to generate recommendations</p>
          </div>
        ) : (
          insights.slice(0, 4).map((insight) => {
            const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.trend;
            const Icon = cfg.icon;
            return (
              <div key={insight.id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("h-3 w-3", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                      <span className={cn(
                        "text-2xs px-1 rounded-full flex-shrink-0",
                        insight.priority === "high" ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                      )}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
                    <a href={insight.href} className={cn("text-2xs font-medium mt-1.5 inline-block transition-opacity hover:opacity-80", cfg.color)}>
                      {insight.action} →
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
