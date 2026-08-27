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
