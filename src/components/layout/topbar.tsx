"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type User } from "next-auth";
import { signOut } from "next-auth/react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  ChevronDown,
  UserCircle,
  Plus,
  Users,
  TrendingUp,
  CheckSquare,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn, getInitials, generateAvatarColor } from "@/lib/utils";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { LeadFormModal } from "@/components/leads/lead-form-modal";
import { TaskFormModal } from "@/components/tasks/task-form-modal";

interface TopbarProps {
  user: User | undefined;
  unreadAlerts?: number;
}

export function Topbar({ user, unreadAlerts = 0 }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const breadcrumbs = useBreadcrumbs();
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen]     = useState(false);
  const [addTaskOpen, setAddTaskOpen]     = useState(false);

  // Listen for ?new= param to auto-open modals
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      const path = window.location.pathname;
      if (path.includes("/clients")) setAddClientOpen(true);
      if (path.includes("/leads"))   setAddLeadOpen(true);
      if (path.includes("/tasks"))   setAddTaskOpen(true);
    }
  }, []);

  return (
    <>
      <header className="h-[57px] border-b border-border bg-card/50 backdrop-blur-sm flex items-center gap-4 px-6 flex-shrink-0 sticky top-0 z-20">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/50 text-sm">/</span>}
              <span className={cn("text-sm truncate", i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground")}>
                {crumb.label}
              </span>
            </div>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-3 text-xs border-border"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-2 text-2xs bg-muted px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
          </Button>

          {/* Quick add */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 gap-1.5 shadow-glow-sm">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAddClientOpen(true)} className="cursor-pointer">
                <Users className="h-4 w-4 mr-2" /> New Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddLeadOpen(true)} className="cursor-pointer">
                <TrendingUp className="h-4 w-4 mr-2" /> New Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddTaskOpen(true)} className="cursor-pointer">
                <CheckSquare className="h-4 w-4 mr-2" /> New Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification bell — real count */}
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-danger rounded-full text-white text-2xs font-bold flex items-center justify-center px-1 leading-none">
                  {unreadAlerts > 99 ? "99+" : unreadAlerts}
                </span>
              )}
            </Button>
          </Link>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-accent rounded-lg px-2 py-1.5 transition-colors group">
                <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold flex-shrink-0", generateAvatarColor(user?.id || "user"))}>
                  {getInitials(user?.name)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-foreground leading-tight">{user?.name?.split(" ")[0]}</p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/settings" className="cursor-pointer"><UserCircle className="h-4 w-4 mr-2" /> Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/settings" className="cursor-pointer"><Settings className="h-4 w-4 mr-2" /> Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger focus:text-danger cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global modals */}
      <ClientFormModal open={addClientOpen} onClose={() => setAddClientOpen(false)} />
      <LeadFormModal   open={addLeadOpen}   onClose={() => setAddLeadOpen(false)} />
      <TaskFormModal   open={addTaskOpen}   onClose={() => setAddTaskOpen(false)} />
    </>
  );
}
