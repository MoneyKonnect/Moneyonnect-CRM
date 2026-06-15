import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrgUserIds } from "@/lib/org";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/ui/command-palette";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id ?? "";
  const orgUserIds = await getOrgUserIds();

  // Minimal counts — only what sidebar needs
  const [unreadAlerts, activeLeads, totalClients] = await Promise.all([
    db.smartAlert.count({ where: { ownerId: { in: orgUserIds }, isRead: false } }).catch(() => 0),
    db.lead.count({ where: { ownerId: { in: orgUserIds }, deletedAt: null, stage: { notIn: ["CONVERTED","LOST"] } } }).catch(() => 0),
    db.client.count({ where: { ownerId: { in: orgUserIds }, deletedAt: null } }).catch(() => 0),
  ]);

  const counts = {
    clients: totalClients,
    leads: activeLeads,
    notifications: unreadAlerts,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar counts={counts} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar user={session.user} unreadAlerts={unreadAlerts} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
