"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, TrendingUp, CheckSquare, Megaphone,
  FileText, BarChart3, Building2, Zap, Sparkles, Bell, Settings,
  ChevronLeft, ChevronRight, Cake, IndianRupee, Shield,
  ChevronDown, Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  counts?: {
    clients?: number;
    leads?: number;
    tasks?: number;
    notifications?: number;
  };
}

export function Sidebar({ counts = {} }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(
    pathname.startsWith("/leads") || pathname.startsWith("/operations") || pathname.startsWith("/webinars")
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const count = item.countKey ? counts[item.countKey as keyof typeof counts] : undefined;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group relative",
          active ? "bg-brand-500/10 text-brand-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-brand-400" : "text-muted-foreground group-hover:text-foreground")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn("text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                item.countKey === "notifications" || item.countKey === "tasks"
                  ? "bg-danger/15 text-danger"
                  : "bg-brand-500/15 text-brand-400"
              )}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </>
        )}
        {collapsed && count !== undefined && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-white text-2xs font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  };

  // Pipeline dropdown section
  const PipelineSection = () => {
    const isPipelineActive = pathname.startsWith("/leads") || pathname.startsWith("/operations") || pathname.startsWith("/webinars");
    if (collapsed) {
      return (
        <Link href="/leads"
          className={cn("flex items-center justify-center px-2 py-2 rounded-lg text-sm transition-all relative",
            isPipelineActive ? "bg-brand-500/10 text-brand-400" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}>
          <TrendingUp className="h-4 w-4" />
          {(counts.leads ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 rounded-full text-white text-2xs font-bold flex items-center justify-center">
              {counts.leads}
            </span>
          )}
        </Link>
      );
    }

    return (
      <div>
        {/* Pipeline parent button */}
        <button
          onClick={() => setPipelineOpen(!pipelineOpen)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
            isPipelineActive ? "bg-brand-500/10 text-brand-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <TrendingUp className={cn("h-4 w-4 flex-shrink-0", isPipelineActive ? "text-brand-400" : "text-muted-foreground")} />
          <span className="flex-1 text-left">Pipeline</span>
          {(counts.leads ?? 0) > 0 && (
            <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400">
              {counts.leads}
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform", pipelineOpen && "rotate-180")} />
        </button>

        {/* Sub-items */}
        {pipelineOpen && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
            <Link
              href="/leads"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
                pathname.startsWith("/leads") ? "text-brand-400 font-medium bg-brand-500/5" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Leads
            </Link>
            <Link
              href="/operations"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
                pathname.startsWith("/operations") ? "text-brand-400 font-medium bg-brand-500/5" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Kanban className="h-3.5 w-3.5" /> Operations Board
            </Link>
            <Link
              href="/webinars"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
                pathname.startsWith("/webinars") ? "text-brand-400 font-medium bg-brand-500/5" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Globe className="h-3.5 w-3.5" /> Webinars
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col border-r border-border bg-card transition-all duration-200 flex-shrink-0",
      collapsed ? "w-14" : "w-[185px]"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 py-4 border-b border-border flex-shrink-0", collapsed && "justify-center px-2")}>
        <div className="w-7 h-7 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Shield className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-foreground tracking-tight">
            Relation<span className="text-brand-400">IQ</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavItem item={{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }} />
        <NavItem item={{ href: "/clients",   label: "Clients",   icon: Users,      countKey: "clients" }} />

        {/* Pipeline with dropdown */}
        <PipelineSection />

        <NavItem item={{ href: "/tasks",     label: "Tasks",     icon: CheckSquare, countKey: "tasks" }} />
        <NavItem item={{ href: "/campaigns", label: "Campaigns", icon: Megaphone }} />
        <NavItem item={{ href: "/documents", label: "Documents", icon: FileText }} />
        <NavItem item={{ href: "/analytics", label: "Analytics", icon: BarChart3 }} />

        {!collapsed && <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mt-2">Intelligence</p>}
        {collapsed && <div className="my-2 border-t border-border mx-1" />}

        <NavItem item={{ href: "/ai-insights",   label: "AI Insights",       icon: Sparkles }} />
        <NavItem item={{ href: "/notifications",  label: "Notifications",     icon: Bell,    countKey: "notifications" }} />
        <NavItem item={{ href: "/birthdays",      label: "Birthday Calendar", icon: Cake }} />
        <NavItem item={{ href: "/aum",            label: "AUM Dashboard",     icon: IndianRupee }} />

        {!collapsed && <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mt-2">Workspace</p>}
        {collapsed && <div className="my-2 border-t border-border mx-1" />}

        <NavItem item={{ href: "/organization", label: "Organization", icon: Building2 }} />
        <NavItem item={{ href: "/automations",  label: "Automations",  icon: Zap }} />
      </nav>

      {/* Settings + collapse */}
      <div className="border-t border-border p-2 space-y-0.5">
        <NavItem item={{ href: "/settings", label: "Settings", icon: Settings }} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all", collapsed && "justify-center px-2")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
