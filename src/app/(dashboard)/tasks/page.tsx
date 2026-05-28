import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export const metadata: Metadata = { title: "Tasks" };

async function getAllTasks(userId: string) {
  return db.task.findMany({
    where: { assigneeId: userId },
    orderBy: [
      { status: "asc" },
      { priority: "desc" },
      { dueAt: "asc" },
    ],
    include: {
      client: { select: { id: true, fullName: true } },
    },
  });
}

export default async function TasksPage() {
  const session = await auth();
  const tasks = await getAllTasks((session?.user as any)?.id ?? "");

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">
      <TasksPageClient tasks={tasks} />
    </div>
  );
}
