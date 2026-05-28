import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  IndianRupee,
  Calendar,
  ArrowRight,
  Clock,
  Target,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Insights" };

async function getInsightsData(userId: string) {
  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 86400000);
  const next7   = new Date(now.getTime() +  7 * 86400000);
  const past14  = new Date(now.getTime() - 14 * 86400000);

  const [
    dormantLeads, maturingInvestments, overdueFollowUps,
    topClients, birthdaysNext7, nriClients,
    recentlyAdded, highValueLeads, overdueKyc,
    categoryBreakdown,
  ] = await Promise.all([
    db.lead.findMany({
      where: { ownerId: userId, deletedAt: null, stage: { notIn: ["CONVERTED","LOST"] }, lastActivityAt: { lt: past14 } },
      select: { id: true, fullName: true, lastActivityAt: true, stage: true, estimatedValue: true },
      orderBy: { lastActivityAt: "asc" }, take: 5,
    }),
    db.investment.findMany({
      where: { client: { ownerId: userId }, maturityDate: { gte: now, lte: next30 }, status: "ACTIVE" },
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { maturityDate: "asc" },
    }),
    db.lead.findMany({
      where: { ownerId: userId, deletedAt: null, nextFollowUpAt: { lt: now }, stage: { notIn: ["CONVERTED","LOST"] } },
      select: { id: true, fullName: true, nextFollowUpAt: true, stage: true },
      orderBy: { nextFollowUpAt: "asc" }, take: 5,
    }),
    db.client.findMany({
      where: { ownerId: userId, deletedAt: null, aum: { gt: 5000000 } },
      select: { id: true, fullName: true, aum: true, category: true },
      orderBy: { aum: "desc" }, take: 5,
    }),
    db.client.findMany({
      where: {
        ownerId: userId, deletedAt: null,
        dob: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lte: next7,
        },
      },
      select: { id: true, fullName: true, dob: true },
    }),
    db.client.findMany({
      where: { ownerId: userId, deletedAt: null, residency: { residencyType: { in: ["NRI","OCI"] } } },
      select: { id: true, fullName: true, aum: true, residency: { select: { residencyType: true, countryOfResidence: true } } },
      take: 5,
    }),
    db.client.findMany({
      where: { ownerId: userId, deletedAt: null, createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
      select: { id: true, fullName: true, createdAt: true, category: true },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    db.lead.findMany({
      where: { ownerId: userId, deletedAt: null, estimatedValue: { gt: 1000000 }, stage: { notIn: ["CONVERTED","LOST"] } },
      select: { id: true, fullName: true, estimatedValue: true, stage: true },
      orderBy: { estimatedValue: "desc" }, take: 5,
    }),
    db.document.findMany({
      where: { client: { ownerId: userId }, expiresAt: { gte: now, lte: next30 } },
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { expiresAt: "asc" }, take: 5,
    }),
    db.client.groupBy({
      by: ["category"],
      where: { ownerId: userId, deletedAt: null },
      _count: true,
      _sum: { aum: true },
    }),
  ]);

  return { dormantLeads, maturingInvestments, overdueFollowUps, topClients, birthdaysNext7, nriClients, recentlyAdded, highValueLeads, overdueKyc, categoryBreakdown };
}

const INSIGHT_SECTIONS = [
  { key: "dormantLeads",        icon: AlertTriangle, title: "Leads Going Cold",         color: "text-amber-400", bg: "bg-amber-500/10",  border: "border-amber-500/20", emptyLabel: "No dormant leads 🎉" },
  { key: "maturingInvestments", icon: IndianRupee,   title: "Investments Maturing",      color: "text-emerald-400",bg:"bg-emerald-500/10",border:"border-emerald-500/20", emptyLabel: "No investments maturing" },
  { key: "overdueFollowUps",    icon: Clock,         title: "Overdue Follow-ups",        color: "text-danger",    bg: "bg-danger/10",    border: "border-danger/20",    emptyLabel: "All follow-ups on track 🎉" },
  { key: "birthdaysNext7",      icon: Calendar,      title: "Birthdays This Week",       color: "text-pink-400",  bg: "bg-pink-500/10",  border: "border-pink-500/20",  emptyLabel: "No birthdays this week" },
  { key: "highValueLeads",      icon: TrendingUp,    title: "High-Value Leads",          color: "text-brand-400", bg: "bg-brand-500/10", border: "border-brand-500/20", emptyLabel: "No high-value leads" },
  { key: "overdueKyc",          icon: AlertTriangle, title: "Documents Expiring Soon",   color: "text-orange-400",bg:"bg-orange-500/10",border:"border-orange-500/20",  emptyLabel: "No documents expiring" },
];

export default async function AiInsightsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const data = await getInsightsData(userId);

  const totalInsights = Object.values(data).reduce((s: number, v: any) => s + (Array.isArray(v) ? v.length : 0), 0);

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            {totalInsights} action item{totalInsights !== 1 ? "s" : ""} across your portfolio — updated live
          </p>
        </div>
      </div>

      {/* Category summary */}
      {data.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {data.categoryBreakdown.map((c: any) => (
            <div key={c.category} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xl font-bold text-foreground">{c._count}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">{c.category.replace(/_/g," ")}</p>
              {c._sum.aum && <p className="text-2xs text-emerald-400 mt-0.5">{formatCurrency(Number(c._sum.aum))}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Insight sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INSIGHT_SECTIONS.map(section => {
          const Icon = section.icon;
          const items = (data as any)[section.key] || [];
          return (
            <div key={section.key} className={cn("rounded-xl border bg-card overflow-hidden", section.border)}>
              <div className={cn("px-5 py-4 border-b flex items-center gap-2", section.bg, section.border.replace("border-","border-b-"))}>
                <Icon className={cn("h-4 w-4", section.color)} />
                <h3 className={cn("text-sm font-semibold", section.color)}>{section.title}</h3>
                <span className={cn("ml-auto text-xs font-bold", section.color)}>{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-muted-foreground">{section.emptyLabel}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item: any) => (
                    <InsightRow key={item.id} item={item} sectionKey={section.key} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NRI clients */}
      {data.nriClients.length > 0 && (
        <div className="rounded-xl border border-blue-500/20 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-blue-400">NRI / OCI Clients — Review FATCA & Compliance</h3>
            <span className="ml-auto text-xs font-bold text-blue-400">{data.nriClients.length}</span>
          </div>
          <div className="divide-y divide-border">
            {data.nriClients.map((c: any) => (
              <Link key={c.id} href={`/clients/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.fullName}</p>
                  <p className="text-2xs text-muted-foreground">
                    {c.residency?.residencyType} · {c.residency?.countryOfResidence || "Location not set"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.aum && <span className="text-xs text-emerald-400 font-medium">{formatCurrency(Number(c.aum))}</span>}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightRow({ item, sectionKey }: { item: any; sectionKey: string }) {
  const getHref = () => {
    if (sectionKey === "maturingInvestments") return `/clients/${item.client?.id}`;
    if (sectionKey === "overdueKyc") return `/clients/${item.client?.id}`;
    if (sectionKey.includes("Lead") || sectionKey === "dormantLeads" || sectionKey === "overdueFollowUps" || sectionKey === "highValueLeads") return `/leads/${item.id}`;
    return `/clients/${item.id}`;
  };

  const getSubtext = () => {
    if (sectionKey === "dormantLeads") return `Stage: ${item.stage?.replace(/_/g," ")} · Last activity: ${formatDate(item.lastActivityAt, "relative")}`;
    if (sectionKey === "maturingInvestments") return `${item.schemeName} · Matures ${formatDate(item.maturityDate, "short")}`;
    if (sectionKey === "overdueFollowUps") return `Follow-up was ${formatDate(item.nextFollowUpAt, "relative")}`;
    if (sectionKey === "birthdaysNext7") return `Birthday on ${formatDate(item.dob, "short")}`;
    if (sectionKey === "highValueLeads") return `Stage: ${item.stage?.replace(/_/g," ")}`;
    if (sectionKey === "overdueKyc") return `${item.docType} expires ${formatDate(item.expiresAt, "short")}`;
    return "";
  };

  const getName = () => {
    if (sectionKey === "maturingInvestments") return item.client?.fullName;
    if (sectionKey === "overdueKyc") return item.client?.fullName;
    return item.fullName;
  };

  const getValue = () => {
    if (sectionKey === "maturingInvestments") return formatCurrency(Number(item.amount));
    if (sectionKey === "highValueLeads") return formatCurrency(Number(item.estimatedValue));
    if (item.aum) return formatCurrency(Number(item.aum));
    return null;
  };

  return (
    <Link href={getHref()}
      className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{getName()}</p>
        <p className="text-2xs text-muted-foreground mt-0.5">{getSubtext()}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {getValue() && <span className="text-xs text-emerald-400 font-medium">{getValue()}</span>}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </Link>
  );
}
