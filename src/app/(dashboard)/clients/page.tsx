import { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientsTable } from "@/components/clients/clients-table";
import { ClientsHeader } from "@/components/clients/clients-header";

export const metadata: Metadata = { title: "Clients" };

interface ClientsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    type?: string; // "new" | "converted" | "existing"
    ageFilter?: string; // "minor" | "adult" | "senior"
    page?: string;
  }>;
}

function getClientType(client: any): "new" | "converted" | "existing" {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  if (client.sourceLeadId) return "converted";
  if (new Date(client.createdAt) >= ninetyDaysAgo) return "new";
  return "existing";
}

async function getClients(userId: string, params: Awaited<ClientsPageProps["searchParams"]>) {
  const { q, status, category, type, ageFilter, page = "1" } = params;
  const pageSize = 20;
  const skip = (parseInt(page) - 1) * pageSize;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const baseWhere: any = {
    // org-wide
    deletedAt: null,
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { pan: { contains: q, mode: "insensitive" as const } },
        { city: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as any }),
    ...(category && { category: category as any }),
  };

  // Age filter
  if (ageFilter === "minor") {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    baseWhere.dob = { gt: eighteenYearsAgo };
  } else if (ageFilter === "adult") {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const sixtyYearsAgo = new Date();
    sixtyYearsAgo.setFullYear(sixtyYearsAgo.getFullYear() - 60);
    baseWhere.dob = { lte: eighteenYearsAgo, gt: sixtyYearsAgo };
  } else if (ageFilter === "senior") {
    const sixtyYearsAgo = new Date();
    sixtyYearsAgo.setFullYear(sixtyYearsAgo.getFullYear() - 60);
    baseWhere.dob = { lte: sixtyYearsAgo };
  }

  // Type filter
  if (type === "new") {
    baseWhere.createdAt = { gte: ninetyDaysAgo };
    baseWhere.sourceLeadId = null;
  } else if (type === "converted") {
    baseWhere.sourceLeadId = { not: null };
  } else if (type === "existing") {
    baseWhere.createdAt = { lt: ninetyDaysAgo };
    baseWhere.sourceLeadId = null;
  }

  const [clients, total, newCount, convertedCount, existingCount] = await Promise.all([
    db.client.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        tags: { include: { tag: true } },
        residency: { select: { residencyType: true } },
        _count: { select: { interactions: true, tasks: true, documents: true } },
      },
    }),
    db.client.count({ where: baseWhere }),
    db.client.count({ where: { // org-wide deletedAt: null, createdAt: { gte: ninetyDaysAgo }, sourceLeadId: null } }),
    db.client.count({ where: { // org-wide deletedAt: null, sourceLeadId: { not: null } } }),
    db.client.count({ where: { // org-wide deletedAt: null, createdAt: { lt: ninetyDaysAgo }, sourceLeadId: null } }),
  ]);

  // Tag each client with type
  const clientsWithType = clients.map(c => ({ ...c, clientType: getClientType(c) }));

  return { clients: clientsWithType, total, page: parseInt(page), pageSize, newCount, convertedCount, existingCount };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const { clients, total, page, pageSize, newCount, convertedCount, existingCount } = await getClients((session?.user as any)?.id ?? "", params);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Suspense fallback={null}>
        <ClientsHeader total={total} newCount={newCount} convertedCount={convertedCount} existingCount={existingCount} />
      </Suspense>
      <ClientsTable
        clients={clients}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
