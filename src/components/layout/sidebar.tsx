"use client";
import Image from "next/image";

import { Ticket, useState } from "react";
import Link from "next/link";
import { Ticket, usePathname } from "next/navigation";
import { Ticket,
  LayoutDashboard, Users, TrendingUp, Megaphone,
  BarChart3, Building2, Zap, Sparkles, Bell, Settings,
  ChevronLeft, ChevronRight, Cake, IndianRupee, Shield,
  ChevronDown, CalendarClock, ExternalLink,
} from "lucide-react";
import { Ticket, cn } from "@/lib/utils";

interface SidebarProps {
  counts?: {
    clients?: number;
    leads?: number;
    notifications?: number;
  };
}

const TrelloIcon = () => (
  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/>
  </svg>
);

export function Sidebar({ counts = {} }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [trelloOpen, setTrelloOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const NavItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const count = item.countKey ? counts[item.countKey as keyof typeof counts] : undefined;

    return (
      <Link
        href={item.href}
        prefetch={false}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group relative",
          active ? "bg-brand-500/10 text-brand-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-brand-400" : "text-muted-foreground group-hover:text-foreground")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn("text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                item.countKey === "notifications" ? "bg-danger/15 text-danger" : "bg-brand-500/15 text-brand-400"
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

  const TrelloSection = () => {
    if (collapsed) {
      return (
        <Link href="/trello" prefetch={false}
          className="flex items-center justify-center px-2 py-2 rounded-lg text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Trello">
          <TrelloIcon />
        </Link>
      );
    }
    return (
      <div>
        <button
          onClick={() => setTrelloOpen(!trelloOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <TrelloIcon />
          <span className="flex-1 text-left">Trello</span>
          <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform", trelloOpen && "rotate-180")} />
        </button>
        {trelloOpen && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
            <Link href="/trello" prefetch={false}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-muted-foreground hover:text-foreground hover:bg-accent">
              <ExternalLink className="h-3.5 w-3.5" /> Operations Board
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
        <Image src="/mk-logo.jpeg" alt="MoneyKonnect" width={28} height={28} className="rounded-md flex-shrink-0" />
        {!collapsed && (
          <span className="font-bold text-sm text-foreground tracking-tight">
            MoneyKonnect <span className="text-brand-400">CRM</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavItem item={{ href: "/dashboard",     label: "Dashboard",        icon: LayoutDashboard }} />
        <NavItem item={{ href: "/clients",       label: "Clients",          icon: Users, countKey: "clients" }} />
        <NavItem item={{ href: "/leads",         label: "Leads",            icon: TrendingUp, countKey: "leads" }} />
        <TrelloSection />
        <NavItem item={{ href: "/meeting-setup", label: "Meeting Set-Up",   icon: CalendarClock }} />
        <NavItem item={{ href: "/campaigns",     label: "Campaigns",        icon: Megaphone }} />
        <NavItem item={{ href: "/analytics",     label: "Analytics",        icon: BarChart3 }} />

        {!collapsed && <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mt-2">Intelligence</p>}
        {collapsed && <div className="my-2 border-t border-border mx-1" />}

        <NavItem item={{ href: "/ai-insights",   label: "AI Insights",      icon: Sparkles }} />
        <NavItem item={{ href: "/notifications", label: "Notifications",    icon: Bell, countKey: "notifications" }} />
        <NavItem item={{ href: "/birthdays",     label: "Birthday Calendar",icon: Cake }} />
        <NavItem item={{ href: "/aum",           label: "AUM Dashboard",    icon: IndianRupee }} />

        {!collapsed && <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mt-2">Workspace</p>}
        {collapsed && <div className="my-2 border-t border-border mx-1" />}

        <NavItem item={{ href: "/tickets", label: "My Work", icon: Ticket }} />
        <NavItem item={{ href: "/organization", label: "Organization",      icon: Building2 }} />
        <NavItem item={{ href: "/automations",  label: "Automations",       icon: Zap }} />
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
