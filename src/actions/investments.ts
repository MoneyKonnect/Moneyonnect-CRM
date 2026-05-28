"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function logAudit(userId: string, action: string, entityType: string, entityId: string, entityName: string, oldValue: any, newValue: any) {
  try { await db.auditLog.create({ data: { userId, action, entityType, entityId, entityName, oldValue, newValue } }); } catch {}
}

export async function createInvestment(clientId: string, data: {
  schemeName: string;
  type: string;
  amount: string;
  currentValue?: string;
  startDate: string;
  maturityDate?: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const client = await db.client.findFirst({ where: { id: clientId, ownerId: userId, deletedAt: null } });
    if (!client) return { success: false, error: "Client not found" };

    const investment = await db.investment.create({
      data: {
        clientId,
        schemeName: data.schemeName,
        type: data.type as any,
        amount: parseFloat(data.amount),
        currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
        startDate: new Date(data.startDate),
        maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
        notes: data.notes || null,
      },
    });

    // Update client AUM
    await recalculateClientAUM(clientId);
    await logAudit(userId, "CREATE", "investment", investment.id, data.schemeName, null, data);
    revalidatePath(`/clients/${clientId}`);
    return { success: true, investment };
  } catch (error) {
    console.error("createInvestment:", error);
    return { success: false, error: "Failed to create investment" };
  }
}

export async function updateInvestment(investmentId: string, data: {
  schemeName?: string;
  currentValue?: string;
  status?: string;
  notes?: string;
  maturityDate?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const existing = await db.investment.findFirst({
      where: { id: investmentId },
      include: { client: { select: { ownerId: true } } },
    });
    if (!existing || existing.client.ownerId !== userId) return { success: false, error: "Not found" };

    const investment = await db.investment.update({
      where: { id: investmentId },
      data: {
        schemeName: data.schemeName,
        currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
        status: data.status,
        notes: data.notes,
        maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
      },
    });

    await recalculateClientAUM(existing.clientId);
    revalidatePath(`/clients/${existing.clientId}`);
    return { success: true, investment };
  } catch (error) {
    return { success: false, error: "Failed to update" };
  }
}

export async function deleteInvestment(investmentId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const existing = await db.investment.findFirst({
      where: { id: investmentId },
      include: { client: { select: { ownerId: true, id: true } } },
    });
    if (!existing || existing.client.ownerId !== userId) return { success: false, error: "Not found" };

    await db.investment.delete({ where: { id: investmentId } });
    await recalculateClientAUM(existing.clientId);
    revalidatePath(`/clients/${existing.clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

async function recalculateClientAUM(clientId: string) {
  const investments = await db.investment.findMany({
    where: { clientId, status: "ACTIVE" },
    select: { currentValue: true, amount: true },
  });
  const totalAUM = investments.reduce((sum: number, inv: {currentValue: any; amount: any}) => {
    return (sum as number) + Number((inv as any).currentValue || (inv as any).amount);
  }, 0);
  await db.client.update({ where: { id: clientId }, data: { aum: totalAUM } });
}

// ─── Financial Goals ─────────────────────────────────────────────────────────

export async function createGoal(clientId: string, data: {
  title: string;
  goalType: string;
  targetAmount: string;
  currentAmount?: string;
  targetDate?: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const client = await db.client.findFirst({ where: { id: clientId, ownerId: userId, deletedAt: null } });
    if (!client) return { success: false, error: "Client not found" };

    const goal = await db.financialGoal.create({
      data: {
        clientId,
        title: data.title,
        goalType: data.goalType as any,
        targetAmount: parseFloat(data.targetAmount),
        currentAmount: data.currentAmount ? parseFloat(data.currentAmount) : 0,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        notes: data.notes || null,
      },
    });
    revalidatePath(`/clients/${clientId}`);
    return { success: true, goal };
  } catch (error) {
    return { success: false, error: "Failed to create goal" };
  }
}

export async function updateGoal(goalId: string, data: { currentAmount?: string; status?: string; notes?: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const existing = await db.financialGoal.findFirst({
      where: { id: goalId },
      include: { client: { select: { ownerId: true } } },
    });
    if (!existing || existing.client.ownerId !== userId) return { success: false, error: "Not found" };

    const goal = await db.financialGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: data.currentAmount ? parseFloat(data.currentAmount) : undefined,
        status: data.status as any,
        notes: data.notes,
      },
    });
    revalidatePath(`/clients/${existing.clientId}`);
    return { success: true, goal };
  } catch (error) {
    return { success: false, error: "Failed to update goal" };
  }
}

export async function deleteGoal(goalId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id;

    const existing = await db.financialGoal.findFirst({
      where: { id: goalId },
      include: { client: { select: { ownerId: true, id: true } } },
    });
    if (!existing || existing.client.ownerId !== userId) return { success: false, error: "Not found" };

    await db.financialGoal.delete({ where: { id: goalId } });
    revalidatePath(`/clients/${existing.clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete goal" };
  }
}
