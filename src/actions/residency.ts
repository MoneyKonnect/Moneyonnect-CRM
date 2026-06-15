"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { residencySchema, type ResidencyInput } from "@/lib/validations/client";
import { revalidatePath } from "next/cache";
import { getOrgUserIds } from "@/lib/org";

export async function saveResidency(clientId: string, data: ResidencyInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const orgUserIds = await getOrgUserIds();
    const client = await db.client.findFirst({
      where: { id: clientId, ownerId: { in: orgUserIds }, deletedAt: null },
    });
    if (!client) return { success: false, error: "Client not found" };

    const parsed = residencySchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid data" };

    const { passportExpiry, ...rest } = parsed.data;

    await db.residencyDetail.upsert({
      where: { clientId },
      create: {
        clientId,
        ...rest,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
      },
      update: {
        ...rest,
        passportExpiry: passportExpiry ? new Date(passportExpiry) : null,
      },
    });

    revalidatePath(`/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error("saveResidency error:", error);
    return { success: false, error: "Failed to save" };
  }
}
