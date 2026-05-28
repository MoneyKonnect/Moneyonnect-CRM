import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  changeDanger?: boolean;
  isPercent?: boolean;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  changeDanger,
  isPercent,
  icon: Icon,
  iconColor,
  iconBg,
}: KpiCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNeutral = change === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-card-hover transition-shadow duration-200 group">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-semibold text-foreground tracking-tight">
        {value}
      </p>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {changeDanger ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
          ) : isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : null}
          <span
            className={cn(
              "text-xs font-medium",
              changeDanger
                ? "text-danger"
                : isPositive
                ? "text-success"
                : "text-muted-foreground"
            )}
          >
            {change > 0 && !changeDanger && "+"}
            {change}
            {isPercent ? "%" : ""}
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
