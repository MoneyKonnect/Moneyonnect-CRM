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
    page?: string;
  }>;
}

async function getClients(userId: string, params: Awaited<ClientsPageProps["searchParams"]>) {
  const { q, status, category, page = "1" } = params;
  const pageSize = 20;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = {
    ownerId: userId,
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

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        tags: { include: { tag: true } },
        residency: { select: { residencyType: true } },
        _count: {
          select: { interactions: true, tasks: true, documents: true },
        },
      },
    }),
    db.client.count({ where }),
  ]);

  return { clients, total, page: parseInt(page), pageSize };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const { clients, total, page, pageSize } = await getClients((session?.user as any)?.id ?? "", params);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Suspense fallback={null}>
        <ClientsHeader total={total} />
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
