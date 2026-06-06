import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AumDashboardClient } from "@/components/intelligence/aum-dashboard";

export const metadata: Metadata = { title: "AUM Dashboard" };

async function getAumData(userId: string) {
  const clients = await db.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true, fullName: true, aum: true, category: true,
      status: true, createdAt: true,
      residency: { select: { residencyType: true } },
      investments: {
        select: { type: true, amount: true, currentValue: true, status: true },
      },
      referredBy: { select: { id: true, fullName: true } },
      referrals: { where: { deletedAt: null }, select: { id: true, fullName: true, aum: true } },
    },
    orderBy: { aum: "desc" },
  });

  const totalAUM = clients.reduce((s, c) => s + Number(c.aum || 0), 0);
  const byCategory = clients.reduce((acc: any, c) => {
    if (!acc[c.category]) acc[c.category] = { count: 0, aum: 0 };
    acc[c.category].count++;
    acc[c.category].aum += Number(c.aum || 0);
    return acc;
  }, {});

  const byResidency = clients.reduce((acc: any, c) => {
    const r = c.residency?.residencyType || "RESIDENT_INDIAN";
    if (!acc[r]) acc[r] = { count: 0, aum: 0 };
    acc[r].count++;
    acc[r].aum += Number(c.aum || 0);
    return acc;
  }, {});

  // Investment breakdown
  const allInvestments = clients.flatMap(c => c.investments);
  const byInvestmentType = allInvestments.reduce((acc: any, inv) => {
    if (!acc[inv.type]) acc[acc[inv.type] = 0, inv.type] = 0;
    acc[inv.type] = (acc[inv.type] || 0) + Number(inv.amount);
    return acc;
  }, {});

  // Top referrers
  const referrers = clients
    .filter(c => c.referrals.length > 0)
    .map(c => ({
      id: c.id,
      name: c.fullName,
      referralCount: c.referrals.length,
      referralAUM: c.referrals.reduce((s, r) => s + Number(r.aum || 0), 0),
    }))
    .sort((a, b) => b.referralAUM - a.referralAUM)
    .slice(0, 5);

  return {
    totalAUM,
    clientCount: clients.length,
    topClients: clients.slice(0, 10),
    byCategory,
    byResidency,
    byInvestmentType,
    referrers,
    averageAUM: clients.length > 0 ? totalAUM / clients.length : 0,
  };
}

export default async function AumPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const data = await getAumData(userId);
  return (
    <div className="p-6 max-w-[1400px]">
      <AumDashboardClient data={data} />
    </div>
  );
}
