"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createInteraction(
  clientId: string,
  data: {
    channel: "PHONE" | "EMAIL" | "WHATSAPP" | "IN_PERSON" | "VIDEO_CALL" | "SMS";
    direction: "INBOUND" | "OUTBOUND";
    summary: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const client = await db.client.findFirst({
      where: { id: clientId, ownerId: session.user.id, deletedAt: null },
    });
    if (!client) return { success: false, error: "Client not found" };

    const interaction = await db.interaction.create({
      data: {
        clientId,
        userId: session.user.id,
        channel: data.channel,
        direction: data.direction,
        summary: data.summary,
      },
    });

    revalidatePath(`/clients/${clientId}`);
    return { success: true, interaction };
  } catch (error) {
    console.error("createInteraction error:", error);
    return { success: false, error: "Failed to log interaction" };
  }
}
