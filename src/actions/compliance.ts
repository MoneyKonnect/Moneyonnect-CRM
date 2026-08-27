"use server";

import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getComplianceEmails(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { fromAddress: { contains: filters.search, mode: "insensitive" } },
        { fromName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const emails = await prisma.complianceEmail.findMany({
      where,
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { receivedAt: "desc" },
      take: 500,
    });

    return emails;
  } catch {
    return [];
  }
}

export async function updateComplianceEmailStatus(
  id: string,
  data: {
    category?: string;
    status?: string;
    resolutionNotes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const userId = (session.user as any).id ?? "";

    const updateData: any = { ...data };
    if (data.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = userId;
    }
    if (data.category && data.category !== "NEEDS_REVIEW") {
      updateData.reviewedAt = new Date();
      updateData.reviewedById = userId;
    }

    await prisma.complianceEmail.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/compliance");
    return { success: true };
  } catch (e) {
    console.error("updateComplianceEmailStatus error:", e);
    return { success: false };
  }
}


const COMPLAINT_LABEL_IDS = ["Label_880004551591226888", "Label_8855910926228474100"];

export async function runComplianceSyncNow() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const baseUrl = "https://moneykonnect-crm.vercel.app";
    const secret = process.env.CRON_SECRET;
    let labelImported = 0;
    let keywordFlagged = 0;

    // 1) Re-check both trusted labels for anything newly added by the team.
    for (const labelId of COMPLAINT_LABEL_IDS) {
      let pageToken: string | undefined;
      do {
        const res = await fetch(`${baseUrl}/api/compliance/import-labeled`, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({ labelId, pageToken }),
        });
        const data = await res.json();
        labelImported += data.inserted || 0;
        pageToken = data.nextPageToken || undefined;
      } while (pageToken);
    }

    // 2) Scan the current month for new keyword-guessed candidates —
    // covers anything that's arrived since the last sync.
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let pageToken: string | undefined;
    do {
      const res = await fetch(`${baseUrl}/api/compliance/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ month, pageToken }),
      });
      const data = await res.json();
      keywordFlagged += data.flagged || 0;
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    revalidatePath("/compliance");
    return { success: true, labelImported, keywordFlagged };
  } catch (e) {
    console.error("runComplianceSyncNow error:", e);
    return { success: false, error: "Sync failed" };
  }
}
