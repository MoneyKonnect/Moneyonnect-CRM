"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { revalidatePath } from "next/cache";

async function logAudit(userId: string, action: string, entityType: string, entityId: string, entityName: string, oldValue: any, newValue: any) {
  try {
    await db.auditLog.create({ data: { userId, action, entityType, entityId, entityName, oldValue, newValue } });
  } catch {}
}

export async function createClient(data: ClientInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const parsed = clientSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || "Invalid data" };
    const { aum, dob, ...rest } = parsed.data;
    const client = await (db.client.create as any)({
      data: {
        ...rest,
        ownerId: session.user.id,
        aum: aum ? parseFloat(aum) : null,
        dob: dob ? new Date(dob) : null,
        email: rest.email || null,
        pan: rest.pan ? rest.pan.toUpperCase() : null,
      },
    });
    // Create default onboarding checklist
    const steps = [
      { stepKey: "pan_collected", stepName: "PAN Card collected", sortOrder: 1 },
      { stepKey: "aadhaar_collected", stepName: "Aadhaar collected", sortOrder: 2 },
      { stepKey: "bank_details", stepName: "Bank details verified", sortOrder: 3 },
      { stepKey: "risk_profile", stepName: "Risk profile assessment done", sortOrder: 4 },
      { stepKey: "kyc_complete", stepName: "KYC completed", sortOrder: 5 },
      { stepKey: "first_investment", stepName: "First investment placed", sortOrder: 6 },
      { stepKey: "nominee_added", stepName: "Nominee details added", sortOrder: 7 },
      { stepKey: "will_discussed", stepName: "Will / estate planning discussed", sortOrder: 8 },
    ];
    await db.onboardingChecklist.createMany({ data: steps.map(s => ({ ...s, clientId: client.id })) });
    await logAudit(session.user.id, "CREATE", "client", client.id, client.fullName, null, data);
    revalidatePath("/clients");
    return { success: true, client };
  } catch (error) {
    console.error("createClient error:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(clientId: string, data: ClientInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.client.findFirst({ where: { id: clientId, ownerId: session.user.id, deletedAt: null } });
    if (!existing) return { success: false, error: "Client not found" };
    const parsed = clientSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || "Invalid data" };
    const { aum, dob, ...rest } = parsed.data;
    const client = await (db.client.update as any)({
      where: { id: clientId },
      data: {
        ...rest,
        aum: aum ? parseFloat(aum) : null,
        dob: dob ? new Date(dob) : null,
        email: rest.email || null,
        pan: rest.pan ? rest.pan.toUpperCase() : null,
      },
    });
    await logAudit(session.user.id, "UPDATE", "client", clientId, client.fullName, existing, data);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
    return { success: true, client };
  } catch (error) {
    console.error("updateClient error:", error);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(clientId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.client.findFirst({ where: { id: clientId, ownerId: session.user.id, deletedAt: null } });
    if (!existing) return { success: false, error: "Client not found" };
    await (db.client.update as any)({ where: { id: clientId }, data: { deletedAt: new Date() } });
    await logAudit(session.user.id, "DELETE", "client", clientId, existing.fullName, existing, null);
    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error("deleteClient error:", error);
    return { success: false, error: "Failed to delete client" };
  }
}

export async function getClient(clientId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return db.client.findFirst({
      where: { id: clientId, ownerId: session.user.id, deletedAt: null },
      include: {
        residency: true,
        documents: { orderBy: { createdAt: "desc" } },
        interactions: {
          orderBy: { occurredAt: "desc" },
          take: 30,
          include: {
            user: { select: { name: true } },
            familyMember: { select: { id: true, fullName: true } },
          },
        },
        notes: {
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          include: { author: { select: { id: true, name: true } } },
        },
        tasks: {
          where: { status: { not: "COMPLETED" } },
          orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
        },
        investments: { orderBy: { startDate: "desc" } },
        tags: { include: { tag: true } },
        goals: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
        onboarding: { orderBy: { sortOrder: "asc" } },
        riskProfile: true,
        referredBy: { select: { id: true, fullName: true, category: true } },
        referrals: { where: { deletedAt: null }, select: { id: true, fullName: true, aum: true, category: true }, orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { interactions: true, documents: true, tasks: true } },
      },
    });
  } catch (error) {
    console.error("getClient error:", error);
    return null;
  }
}

export async function convertLeadToClient(leadId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const lead = await db.lead.findFirst({ where: { id: leadId, ownerId: session.user.id, deletedAt: null } });
    if (!lead) return { success: false, error: "Lead not found" };
    const client = await (db.client.create as any)({
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
    await db.lead.update({
      where: { id: leadId },
      data: { stage: "CONVERTED", convertedClientId: client.id },
    });
    await db.leadActivity.create({ data: { leadId, type: "CONVERTED", note: `Converted to client: ${client.fullName}` } });
    const steps = [
      { stepKey: "pan_collected", stepName: "PAN Card collected", sortOrder: 1 },
      { stepKey: "aadhaar_collected", stepName: "Aadhaar collected", sortOrder: 2 },
      { stepKey: "bank_details", stepName: "Bank details verified", sortOrder: 3 },
      { stepKey: "risk_profile", stepName: "Risk profile done", sortOrder: 4 },
      { stepKey: "kyc_complete", stepName: "KYC completed", sortOrder: 5 },
      { stepKey: "first_investment", stepName: "First investment placed", sortOrder: 6 },
    ];
    await db.onboardingChecklist.createMany({ data: steps.map(s => ({ ...s, clientId: client.id })) });
    await logAudit(session.user.id, "STAGE_CHANGE", "lead", leadId, lead.fullName, { stage: "active" }, { stage: "CONVERTED", clientId: client.id });
    revalidatePath("/leads");
    revalidatePath("/clients");
    return { success: true, client };
  } catch (error) {
    console.error("convertLeadToClient error:", error);
    return { success: false, error: "Failed to convert lead" };
  }
}

export async function updateOnboardingStep(checklistId: string, completed: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const step = await db.onboardingChecklist.update({
      where: { id: checklistId },
      data: { completed, completedAt: completed ? new Date() : null },
    });
    revalidatePath(`/clients`);
    return { success: true, step };
  } catch (error) {
    return { success: false, error: "Failed to update" };
  }
}

export async function searchClients(query: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    return db.client.findMany({
      where: {
        ownerId: session.user.id,
        deletedAt: null,
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      select: { id: true, fullName: true, phone: true, email: true, category: true },
      take: 20,
      orderBy: { fullName: "asc" },
    });
  } catch { return []; }
}
