import { Metadata } from "next";
import { db } from "@/lib/db";
import { getOrgUserIds } from "@/lib/org";
import { generateSmartAlerts, getSmartAlerts, deduplicateAlerts } from "@/actions/intelligence";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { Bell } from "lucide-react";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const orgUserIds = await getOrgUserIds();

  // 1. Clean up duplicates first
  await deduplicateAlerts();

  // 2. Only regenerate once per hour to avoid spam
  const lastAlert = await db.smartAlert.findFirst({
    where: { ownerId: { in: orgUserIds } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (!lastAlert || lastAlert.createdAt < oneHourAgo) {
    await generateSmartAlerts();
  }

  // 3. Fetch alerts (excludes deleted ones)
  const alerts = await getSmartAlerts();

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {alerts.filter((a: any) => !a.isRead).length} unread · {alerts.length} total
          </p>
        </div>
      </div>
      <NotificationsClient alerts={alerts} />
    </div>
  );
}
