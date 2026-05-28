"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function logAudit(userId: string, action: string, entityType: string, entityId: string, entityName: string, oldValue: any, newValue: any) {
  try { await db.auditLog.create({ data: { userId, action, entityType, entityId, entityName, oldValue, newValue } }); } catch {}
}

export async function createCampaign(data: {
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  template: string;
  recipientIds?: string[];
  scheduledAt?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!data.name?.trim()) return { success: false, error: "Name required" };
    if (!data.template?.trim()) return { success: false, error: "Template required" };

    const campaign = await db.campaign.create({
      data: {
        createdById: session.user.id,
        name: data.name.trim(),
        channel: data.channel,
        template: data.template.trim(),
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    // Add recipients if provided
    if (data.recipientIds && data.recipientIds.length > 0) {
      await db.campaignRecipient.createMany({
        data: data.recipientIds.map((clientId) => ({
          campaignId: campaign.id,
          clientId,
          status: "PENDING",
        })),
      });
    }

    await logAudit(session.user.id, "CREATE", "campaign", campaign.id, campaign.name, null, data);
    revalidatePath("/campaigns");
    return { success: true, campaign };
  } catch (error) {
    console.error("createCampaign:", error);
    return { success: false, error: "Failed to create campaign" };
  }
}

export async function updateCampaign(campaignId: string, data: Partial<{
  name: string;
  template: string;
  scheduledAt: string;
  status: string;
}>) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.campaign.findFirst({ where: { id: campaignId, createdById: session.user.id } });
    if (!existing) return { success: false, error: "Campaign not found" };
    const campaign = await db.campaign.update({
      where: { id: campaignId },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        status: data.status as any,
      },
    });
    await logAudit(session.user.id, "UPDATE", "campaign", campaignId, campaign.name, existing, data);
    revalidatePath("/campaigns");
    return { success: true, campaign };
  } catch (error) {
    return { success: false, error: "Failed to update" };
  }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const existing = await db.campaign.findFirst({ where: { id: campaignId, createdById: session.user.id } });
    if (!existing) return { success: false, error: "Not found" };
    await db.campaign.delete({ where: { id: campaignId } });
    await logAudit(session.user.id, "DELETE", "campaign", campaignId, existing.name, existing, null);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

export async function sendCampaign(campaignId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, createdById: session.user.id },
      include: { recipients: true },
    });
    if (!campaign) return { success: false, error: "Not found" };

    // Mark all recipients as sent (in real app, integrate with MessageSquare/email API)
    await db.campaignRecipient.updateMany({
      where: { campaignId },
      data: { status: "SENT", sentAt: new Date() },
    });

    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date() },
    });

    await logAudit(session.user.id, "UPDATE", "campaign", campaignId, campaign.name, { status: "DRAFT" }, { status: "SENT" });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to send" };
  }
}

export async function addRecipients(campaignId: string, clientIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    await db.campaignRecipient.createMany({
      skipDuplicates: true,
      data: clientIds.map((clientId) => ({ campaignId, clientId, status: "PENDING" })),
    });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add recipients" };
  }
}
