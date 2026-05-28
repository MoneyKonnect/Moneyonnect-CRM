"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createWebinar(data: {
  title: string;
  scheduledAt: string;
  platform: string;
  meetingLink?: string;
  description?: string;
  leadIds: string[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id ?? "";

    const webinar = await db.webinar.create({
      data: {
        title: data.title,
        scheduledAt: new Date(data.scheduledAt),
        platform: data.platform,
        meetingLink: data.meetingLink || null,
        description: data.description || null,
        createdById: userId,
        invites: {
          create: data.leadIds.map(leadId => ({ leadId, status: "PENDING" })),
        },
      },
      include: { invites: true },
    });

    // Create a task for each lead
    for (const leadId of data.leadIds) {
      await db.task.create({
        data: {
          title: `Webinar: ${data.title}`,
          type: "MEETING",
          priority: "HIGH",
          status: "PENDING",
          assigneeId: userId,
          leadId,
          dueAt: new Date(data.scheduledAt),
          description: `Platform: ${data.platform}${data.meetingLink ? ` | Link: ${data.meetingLink}` : ""}`,
        },
      });
    }

    revalidatePath("/webinars");
    revalidatePath("/leads");
    return { success: true, webinar };
  } catch (error) {
    console.error("createWebinar error:", error);
    return { success: false, error: "Failed to create webinar" };
  }
}

export async function getWebinars() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = (session.user as any).id ?? "";

    return db.webinar.findMany({
      where: { createdById: userId },
      include: {
        invites: {
          include: { lead: { select: { id: true, fullName: true, phone: true, email: true } } },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });
  } catch { return []; }
}

export async function deleteWebinar(webinarId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const userId = (session.user as any).id ?? "";
    await db.webinar.delete({ where: { id: webinarId, createdById: userId } });
    revalidatePath("/webinars");
    return { success: true };
  } catch { return { success: false }; }
}

export async function scheduleMeeting(data: {
  leadId: string;
  scheduledAt: string;
  platform: string;
  meetingLink?: string;
  notes?: string;
  sendWhatsApp: boolean;
  sendEmail: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = (session.user as any).id ?? "";

    // Create task
    const task = await db.task.create({
      data: {
        title: `Meeting via ${data.platform}`,
        type: "MEETING",
        priority: "HIGH",
        status: "PENDING",
        assigneeId: userId,
        leadId: data.leadId,
        dueAt: new Date(data.scheduledAt),
        description: `${data.notes || ""}${data.meetingLink ? `\nLink: ${data.meetingLink}` : ""}`,
      },
    });

    // Move lead to MEETING_SCHEDULED
    await db.lead.update({
      where: { id: data.leadId },
      data: { stage: "MEETING_SCHEDULED", lastActivityAt: new Date() },
    });

    // Log activity
    await db.leadActivity.create({
      data: {
        leadId: data.leadId,
        type: "MEETING_SCHEDULED",
        note: `Meeting scheduled on ${new Date(data.scheduledAt).toLocaleString("en-IN")} via ${data.platform}${data.meetingLink ? `. Link: ${data.meetingLink}` : ""}`,
      },
    });

    revalidatePath("/leads");
    return { success: true, task, meetingLink: data.meetingLink };
  } catch (error) {
    console.error("scheduleMeeting error:", error);
    return { success: false, error: "Failed to schedule" };
  }
}
