"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Cake,
  Users,
  Crown,
  MessageSquare,
  Phone,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBirthdayCalendar } from "@/actions/intelligence";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const CATEGORY_COLORS: Record<string, string> = {
  ULTRA_HNI: "bg-emerald-500 text-white",
  HNI: "bg-amber-500 text-white",
  PREMIUM: "bg-violet-500 text-white",
  STANDARD: "bg-blue-500 text-white",
  RETAIL: "bg-muted-foreground text-white",
  FAMILY_MEMBER: "bg-pink-500 text-white",
};

export function BirthdayCalendarClient() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadBirthdays();
  }, [month, year]);

  const loadBirthdays = async () => {
    setLoading(true);
    const data = await getBirthdayCalendar(month, year);
    setBirthdays(data);
    setLoading(false);
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const birthdaysByDay = birthdays.reduce((acc: any, b) => {
    if (!acc[b.day]) acc[b.day] = [];
    acc[b.day].push(b);
    return acc;
  }, {});

  const todayDay = now.getMonth() === month && now.getFullYear() === year ? now.getDate() : null;
  const selectedBirthdays = selectedDay ? (birthdaysByDay[selectedDay] || []) : [];

  const monthBirthdays = birthdays.length;
  const upcomingThisWeek = birthdays.filter(b => {
    const d = new Date(year, month, b.day);
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Cake className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Birthday Calendar</h1>
            <p className="text-sm text-muted-foreground">
              {monthBirthdays} birthday{monthBirthdays !== 1 ? "s" : ""} this month
              {upcomingThisWeek.length > 0 && (
                <span className="text-pink-400 ml-2">· {upcomingThisWeek.length} this week</span>
              )}
            </p>
          </div>
        </div>
        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>
            Today
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {birthdays.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "This month", value: birthdays.length, color: "text-pink-400", icon: Cake },
            { label: "Clients", value: birthdays.filter(b => b.type === "CLIENT").length, color: "text-blue-400", icon: Users },
            { label: "Family members", value: birthdays.filter(b => b.type === "FAMILY_MEMBER").length, color: "text-violet-400", icon: Gift },
            { label: "This week", value: upcomingThisWeek.length, color: "text-emerald-400", icon: MessageSquare },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-3.5 w-3.5", stat.color)} />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day) => (
              <div key={day} className="p-3 text-center text-2xs font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayBirthdays = day ? (birthdaysByDay[day] || []) : [];
              const isToday = day === todayDay;
              const isSelected = day === selectedDay;
              const hasBirthday = dayBirthdays.length > 0;
              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    "min-h-[80px] p-2 border-r border-b border-border/50 transition-colors",
                    day ? "cursor-pointer hover:bg-accent/40" : "bg-muted/20",
                    isSelected && "bg-brand-500/10",
                    isToday && !isSelected && "bg-pink-500/5"
                  )}
                >
                  {day && (
                    <>
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1",
                        isToday ? "bg-pink-500 text-white" : isSelected ? "bg-brand-500 text-white" : "text-foreground"
                      )}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayBirthdays.slice(0, 2).map((b: any) => (
                          <div
                            key={b.id}
                            className={cn(
                              "text-2xs px-1 py-0.5 rounded truncate font-medium",
                              b.type === "FAMILY_MEMBER"
                                ? "bg-pink-500/15 text-pink-400"
                                : CATEGORY_COLORS[b.category] || "bg-blue-500/15 text-blue-400"
                            )}
                          >
                            {b.name.split(" ")[0]}
                          </div>
                        ))}
                        {dayBirthdays.length > 2 && (
                          <div className="text-2xs text-muted-foreground pl-1">+{dayBirthdays.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selectedDay && selectedBirthdays.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-pink-500/5">
                <p className="text-sm font-semibold text-foreground">
                  {MONTHS[month]} {selectedDay} — {selectedBirthdays.length} birthday{selectedBirthdays.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="divide-y divide-border">
                {selectedBirthdays.map((b: any) => (
                  <BirthdayCard key={b.id} birthday={b} />
                ))}
              </div>
            </div>
          ) : (
            /* Upcoming birthdays list */
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  {loading ? "Loading…" : `Upcoming in ${MONTHS[month]}`}
                </p>
              </div>
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-pulse space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                  </div>
                </div>
              ) : birthdays.length === 0 ? (
                <div className="p-8 text-center">
                  <Cake className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No birthdays this month</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {birthdays.map((b: any) => (
                    <BirthdayCard key={b.id} birthday={b} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BirthdayCard({ birthday }: { birthday: any }) {
  const isClient = birthday.type === "CLIENT";
  const whatsapp = birthday.phone?.replace(/[^0-9]/g, "");
  const today = new Date();
  const isToday = new Date(today.getFullYear(), today.getMonth(), birthday.day).toDateString() === today.toDateString();

  return (
    <div className={cn("px-4 py-3 hover:bg-accent/30 transition-colors", isToday && "bg-pink-500/5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
            isClient ? "bg-gradient-to-br from-blue-500 to-brand-600" : "bg-gradient-to-br from-pink-500 to-rose-600"
          )}>
            {isClient ? <Users className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {birthday.name}
              {isToday && <span className="ml-1.5 text-2xs text-pink-400">🎂 Today!</span>}
            </p>
            <p className="text-2xs text-muted-foreground">
              {isClient ? birthday.category?.replace(/_/g, " ") : `${birthday.relationship?.replace(/_/g, " ")} · ${birthday.familyGroupName || ""}`}
              {birthday.age && ` · Turns ${birthday.age}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {birthday.clientId && (
            <a
              href={`/clients/${birthday.clientId}`}
              className="text-2xs text-brand-400 hover:text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/20 hover:bg-brand-500/10 transition-colors"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
