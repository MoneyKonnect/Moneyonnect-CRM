"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskSchema, type TaskInput } from "@/lib/validations/lead";
import { revalidatePath } from "next/cache";

export async function createTask(data: TaskInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const parsed = taskSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid data" };

    const { dueAt, ...rest } = parsed.data;

    const task = await db.task.create({
      data: {
        ...rest,
        assigneeId: session.user.id,
        dueAt: dueAt ? new Date(dueAt) : null,
        clientId: rest.clientId || null,
        leadId: rest.leadId || null,
      },
    });

    revalidatePath("/tasks");
    if (rest.clientId) revalidatePath(`/clients/${rest.clientId}`);
    return { success: true, task };
  } catch (error) {
    console.error("createTask error:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(taskId: string, data: Partial<TaskInput>) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const existing = await db.task.findFirst({
      where: { id: taskId, assigneeId: session.user.id },
    });
    if (!existing) return { success: false, error: "Task not found" };

    const { dueAt, ...rest } = data;

    const task = await db.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        completedAt:
          rest.status === "COMPLETED" ? new Date() : existing.completedAt,
      },
    });

    revalidatePath("/tasks");
    if (existing.clientId) revalidatePath(`/clients/${existing.clientId}`);
    return { success: true, task };
  } catch (error) {
    console.error("updateTask error:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function completeTask(taskId: string) {
  return updateTask(taskId, { status: "COMPLETED" });
}

export async function deleteTask(taskId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const existing = await db.task.findFirst({
      where: { id: taskId, assigneeId: session.user.id },
    });
    if (!existing) return { success: false, error: "Task not found" };

    await db.task.delete({ where: { id: taskId } });

    revalidatePath("/tasks");
    if (existing.clientId) revalidatePath(`/clients/${existing.clientId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteTask error:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function getTasks(filters?: {
  status?: string;
  priority?: string;
  clientId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    return db.task.findMany({
      where: {
        assigneeId: session.user.id,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.priority && { priority: filters.priority as any }),
        ...(filters?.clientId && { clientId: filters.clientId }),
      },
      include: {
        client: { select: { id: true, fullName: true } },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    });
  } catch {
    return [];
  }
}
