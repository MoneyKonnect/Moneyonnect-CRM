"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadSchema, type LeadInput } from "@/lib/validations/lead";
import { revalidatePath } from "next/cache";

async function logAudit(userId: string, action: string, entityType: string, entityId: string, entityName: string, oldValue: any, newValue: any) {
  try { await db.auditLog.create({ data: { userId, action, entityType, entityId, entityName, oldValue, newValue } }); } catch {}
}

export async function createLead(data: LeadInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || "Invalid data" };
    const { estimatedValue, nextFollowUpAt, ...rest } = parsed.data;
    const lead = await db.lead.create({
      data: {
        ...rest,
        ownerId: session.user.id,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        email: rest.email || null,
        lastActivityAt: new Date(),
      },
    });
    await db.leadActivity.create({ data: { leadId: lead.id, type: "CREATED", note: "Lead created" } });
    await logAudit(session.user.id, "CREATE", "lead", lead.id, lead.fullName, null, data);
    revalidatePath("/leads");
    return { success: true, lead };
  } catch (error) {
    console.error("createLead:", error);
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(leadId: string, data: Partial<LeadInput>) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.lead.findFirst({ where: { id: leadId, ownerId: session.user.id, deletedAt: null } });
    if (!existing) return { success: false, error: "Lead not found" };
    const { estimatedValue, nextFollowUpAt, ...rest } = data;
    const lead = await db.lead.update({
      where: { id: leadId },
      data: {
        ...rest,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
        email: rest.email || null,
        lastActivityAt: new Date(),
      },
    });
    await logAudit(session.user.id, "UPDATE", "lead", leadId, lead.fullName, existing, data);
    revalidatePath("/leads");
    return { success: true, lead };
  } catch (error) {
    console.error("updateLead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

export async function moveLeadStage(leadId: string, newStage: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.lead.findFirst({ where: { id: leadId, ownerId: session.user.id, deletedAt: null } });
    if (!existing) return { success: false, error: "Lead not found" };
    const [lead] = await Promise.all([
      db.lead.update({ where: { id: leadId }, data: { stage: newStage as any, lastActivityAt: new Date() } }),
      db.leadActivity.create({ data: { leadId, type: "STAGE_CHANGED", note: `Moved from ${existing.stage} to ${newStage}` } }),
    ]);
    await logAudit(session.user.id, "STAGE_CHANGE", "lead", leadId, existing.fullName, { stage: existing.stage }, { stage: newStage });
    revalidatePath("/leads");
    return { success: true, lead };
  } catch (error) {
    console.error("moveLeadStage:", error);
    return { success: false, error: "Failed to move lead" };
  }
}

export async function deleteLead(leadId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.lead.findFirst({ where: { id: leadId, ownerId: session.user.id, deletedAt: null } });
    if (!existing) return { success: false, error: "Lead not found" };
    await db.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } });
    await logAudit(session.user.id, "DELETE", "lead", leadId, existing.fullName, existing, null);
    revalidatePath("/leads");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete lead" };
  }
}

export async function convertLeadToClient(leadId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const lead = await db.lead.findFirst({ where: { id: leadId, ownerId: session.user.id, deletedAt: null } });
    if (!lead) return { success: false, error: "Lead not found" };
    if (lead.convertedClientId) return { success: false, error: "Already converted" };
    const client = await db.client.create({
      data: {
        ownerId: session.user.id,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
        status: "ACTIVE",
        category: "STANDARD",
        residency: { create: { residencyType: "RESIDENT_INDIAN" } },
      },
    });
    await db.lead.update({ where: { id: leadId }, data: { stage: "CONVERTED", convertedClientId: client.id } });
    await db.leadActivity.create({ data: { leadId, type: "CONVERTED", note: `Converted to client profile` } });
    await logAudit(session.user.id, "STAGE_CHANGE", "lead", leadId, lead.fullName, { stage: lead.stage }, { stage: "CONVERTED", clientId: client.id });
    revalidatePath("/leads");
    revalidatePath("/clients");
    return { success: true, client };
  } catch (error) {
    console.error("convertLeadToClient:", error);
    return { success: false, error: "Failed to convert" };
  }
}

export async function addLeadNote(leadId: string, note: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const activity = await db.leadActivity.create({ data: { leadId, type: "NOTE", note } });
    await db.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } });
    revalidatePath("/leads");
    return { success: true, activity };
  } catch { return { success: false, error: "Failed" }; }
}
