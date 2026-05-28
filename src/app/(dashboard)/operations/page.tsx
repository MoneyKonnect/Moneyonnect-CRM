import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OperationsBoardClient } from "@/components/operations/operations-board-client";

export const metadata: Metadata = { title: "Operations Board" };

async function getData(userId: string) {
  const [clients, tasks] = await Promise.all([
    db.client.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    db.task.findMany({
      where: { assigneeId: userId },
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { clients, tasks };
}

export default async function OperationsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";
  const { clients, tasks } = await getData(userId);
  return (
    <div className="flex flex-col h-full">
      <OperationsBoardClient tasks={tasks} clients={clients} />
    </div>
  );
}
