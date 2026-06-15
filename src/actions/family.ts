"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getOrgUserIds } from "@/lib/org";

// ─── Family Groups ──────────────────────────────────────────────────────────

export async function createFamilyGroup(data: {
  name: string;
  groupType: "REGULAR" | "HUF";
  headClientId?: string;
  kartaName?: string;
  hufPan?: string;
  hufBankDetails?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const group = await db.familyGroup.create({
    data: { ...data, ownerId: session.user.id },
  });

  await logAudit(session.user.id, "CREATE", "family_group", group.id, group.name, null, data);
  revalidatePath("/clients");
  return { success: true, group };
}

export async function updateFamilyGroup(id: string, data: any) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const old = await db.familyGroup.findFirst({ where: { id, ownerId: { in: orgUserIds } } });
  if (!old) return { success: false, error: "Not found" };

  const group = await db.familyGroup.update({ where: { id }, data });
  await logAudit(session.user.id, "UPDATE", "family_group", id, group.name, old, data);
  revalidatePath("/clients");
  return { success: true, group };
}

export async function deleteFamilyGroup(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const group = await db.familyGroup.findFirst({ where: { id, ownerId: { in: orgUserIds } } });
  if (!group) return { success: false, error: "Not found" };

  await db.familyGroup.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(session.user.id, "DELETE", "family_group", id, group.name, group, null);
  revalidatePath("/clients");
  return { success: true };
}

export async function getFamilyGroupsForClient(clientId: string) {
  try {
  const session = await auth();
  if (!session?.user?.id) return [];

  const orgUserIds = await getOrgUserIds();
  return await db.familyGroup.findMany({
    where: {
      ownerId: { in: orgUserIds },
      deletedAt: null,
      OR: [
        { headClientId: clientId },
        { members: { some: { linkedClientId: clientId } } },
      ],
    },
    include: {
      members: {
        include: {
          linkedClient: { select: { id: true, fullName: true, status: true, aum: true, pan: true } },
          suggestions: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy: { isHeadOfFamily: "desc" },
      },
      headClient: { select: { id: true, fullName: true } },
    },
  });
  } catch (error) {
    console.error("getFamilyGroupsForClient error:", error);
    return [];
  }
}

// ─── Family Members ─────────────────────────────────────────────────────────

export async function createFamilyMember(familyGroupId: string, data: {
  relationship: string;
  fullName: string;
  dob?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  education?: string;
  lifeStage?: string;
  dependencyType?: string;
  isHufCoparcener?: boolean;
  isHeadOfFamily?: boolean;
  communicationConsent?: boolean;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const group = await db.familyGroup.findFirst({
    where: { id: familyGroupId, ownerId: { in: orgUserIds }, deletedAt: null },
  });
  if (!group) return { success: false, error: "Family group not found" };

  const { dob, ...rest } = data;
  const member = await db.familyMember.create({
    data: {
      familyGroupId,
      ...rest,
      relationship: rest.relationship as any,
      lifeStage: rest.lifeStage as any || null,
      dependencyType: rest.dependencyType as any || "INDEPENDENT",
      dob: dob ? new Date(dob) : null,
      email: rest.email || null,
    },
  });

  // Auto-generate suggestions based on life stage
  if (member.lifeStage) {
    await generateSuggestionsForMember(member.id, member.lifeStage, session.user.id);
  }

  await logAudit(session.user.id, "CREATE", "family_member", member.id, member.fullName, null, data);
  revalidatePath(`/clients`);
  return { success: true, member };
}

export async function updateFamilyMember(memberId: string, data: any) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const old = await db.familyMember.findFirst({
    where: { id: memberId },
    include: { familyGroup: true },
  });
  if (!old || !orgUserIds.includes(old.familyGroup.ownerId)) {
    return { success: false, error: "Not found" };
  }

  const { dob, ...rest } = data;
  const member = await db.familyMember.update({
    where: { id: memberId },
    data: {
      ...rest,
      dob: dob ? new Date(dob) : null,
    },
  });

  // If life stage changed, generate new suggestions
  if (data.lifeStage && data.lifeStage !== old.lifeStage) {
    await generateSuggestionsForMember(memberId, data.lifeStage, session.user.id);
  }

  await logAudit(session.user.id, "UPDATE", "family_member", memberId, member.fullName, old, data);
  revalidatePath(`/clients`);
  return { success: true, member };
}

export async function deleteFamilyMember(memberId: string, action: "REMOVE" | "MOVE", targetGroupId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const member = await db.familyMember.findFirst({
    where: { id: memberId },
    include: { familyGroup: true },
  });
  if (!member || !orgUserIds.includes(member.familyGroup.ownerId)) {
    return { success: false, error: "Not found" };
  }

  if (action === "MOVE" && targetGroupId) {
    await db.familyMember.update({
      where: { id: memberId },
      data: { familyGroupId: targetGroupId },
    });
  } else {
    await db.familyMember.delete({ where: { id: memberId } });
  }

  await logAudit(session.user.id, "DELETE", "family_member", memberId, member.fullName, member, { action, targetGroupId });
  revalidatePath(`/clients`);
  return { success: true };
}

export async function convertMemberToLead(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const member = await db.familyMember.findFirst({
    where: { id: memberId },
    include: { familyGroup: true },
  });
  if (!member || !orgUserIds.includes(member.familyGroup.ownerId)) {
    return { success: false, error: "Not found" };
  }

  const lead = await db.lead.create({
    data: {
      ownerId: session.user.id,
      fullName: member.fullName,
      phone: member.phone || null,
      email: member.email || null,
      source: "EXISTING_CLIENT",
      stage: "NEW",
      notes: `Converted from family member. Relationship: ${member.relationship}. Original family: ${member.familyGroup.name}`,
      lastActivityAt: new Date(),
    },
  });

  await logAudit(session.user.id, "CREATE", "lead", lead.id, lead.fullName, null, { convertedFrom: "family_member", memberId });
  revalidatePath(`/clients`);
  revalidatePath(`/leads`);
  return { success: true, lead };
}

export async function convertMemberToClient(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const member = await db.familyMember.findFirst({
    where: { id: memberId },
    include: { familyGroup: true },
  });
  if (!member || !orgUserIds.includes(member.familyGroup.ownerId)) {
    return { success: false, error: "Not found" };
  }
  if (member.linkedClientId) {
    return { success: false, error: "Already linked to a client" };
  }

  // Create standalone client
  const client = await db.client.create({
    data: {
      ownerId: session.user.id,
      fullName: member.fullName,
      phone: member.phone || null,
      email: member.email || null,
      dob: member.dob || null,
      occupation: member.occupation || null,
      status: "PROSPECT",
      category: "STANDARD",
      residency: { create: { residencyType: "RESIDENT_INDIAN" } },
    },
  });

  // Link member to client
  await db.familyMember.update({
    where: { id: memberId },
    data: { linkedClientId: client.id },
  });

  // Transfer notes, interactions (by adding reference)
  await logAudit(session.user.id, "CREATE", "client", client.id, client.fullName, null, { convertedFrom: "family_member", memberId });
  revalidatePath(`/clients`);
  return { success: true, client };
}

export async function triggerMarriageEvent(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const member = await db.familyMember.findFirst({
    where: { id: memberId },
    include: { familyGroup: true },
  });
  if (!member) return { success: false, error: "Not found" };

  // Create new family group for the married member
  const newFamily = await db.familyGroup.create({
    data: {
      name: `${member.fullName}'s Family`,
      groupType: "REGULAR",
      ownerId: session.user.id,
      notes: `New family created via marriage event. Original family: ${member.familyGroup.name}`,
    },
  });

  // Create lead for in-laws
  const inLawLead = await db.lead.create({
    data: {
      ownerId: session.user.id,
      fullName: `${member.fullName} (In-law family)`,
      source: "EXISTING_CLIENT",
      stage: "NEW",
      notes: `In-law family of ${member.fullName} from ${member.familyGroup.name}. Created via marriage event.`,
      lastActivityAt: new Date(),
    },
  });

  revalidatePath(`/clients`);
  revalidatePath(`/leads`);
  return { success: true, newFamily, inLawLead };
}

// ─── Suggestions ────────────────────────────────────────────────────────────

export async function generateSuggestionsForMember(memberId: string, lifeStage: string, advisorId: string) {
  try {
    const templates = await db.suggestionTemplate.findMany({
      where: {
        isActive: true,
        lifeStages: { has: lifeStage as any },
        isNriSpecific: false,
        isHufSpecific: false,
      },
    });

    // Delete old NEW suggestions to avoid duplicates
    await db.memberSuggestion.deleteMany({
      where: { familyMemberId: memberId, status: "NEW", isCustom: false },
    });

    for (const template of templates) {
      await db.memberSuggestion.create({
        data: {
          familyMemberId: memberId,
          templateId: template.id,
          advisorId,
          status: "NEW",
          isCustom: false,
        },
      });
    }
    return true;
  } catch { return false; }
}

export async function generateNriSuggestionsForMember(memberId: string, lifeStage: string, countryCode: string, advisorId: string) {
  try {
    const templates = await db.suggestionTemplate.findMany({
      where: {
        isActive: true,
        isNriSpecific: true,
        lifeStages: { has: lifeStage as any },
        OR: [
          { countryRules: { isEmpty: true } },
          { countryRules: { has: countryCode } },
        ],
      },
    });

    for (const template of templates) {
      const exists = await db.memberSuggestion.findFirst({
        where: { familyMemberId: memberId, templateId: template.id },
      });
      if (!exists) {
        await db.memberSuggestion.create({
          data: { familyMemberId: memberId, templateId: template.id, advisorId, status: "NEW", isCustom: false },
        });
      }
    }
    return true;
  } catch { return false; }
}

export async function addCustomSuggestion(memberId: string, data: {
  customTitle: string;
  customDesc: string;
  advisorNote?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const suggestion = await db.memberSuggestion.create({
    data: {
      familyMemberId: memberId,
      advisorId: session.user.id,
      isCustom: true,
      status: "NEW",
      customTitle: data.customTitle,
      customDesc: data.customDesc,
      advisorNote: data.advisorNote || null,
    },
  });
  revalidatePath(`/clients`);
  return { success: true, suggestion };
}

export async function updateSuggestionStatus(suggestionId: string, status: string, advisorNote?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const suggestion = await db.memberSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: status as any,
      advisorNote: advisorNote || undefined,
      actionedAt: status !== "NEW" ? new Date() : null,
    },
  });
  revalidatePath(`/clients`);
  return { success: true, suggestion };
}

// ─── Audit Helper ────────────────────────────────────────────────────────────

async function logAudit(userId: string, action: string, entityType: string, entityId: string, entityName: string, oldValue: any, newValue: any) {
  try {
    await db.auditLog.create({
      data: { userId, action, entityType, entityId, entityName, oldValue, newValue },
    });
  } catch {}
}

export async function linkExistingClientToFamily(familyGroupId: string, clientId: string, relationship: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgUserIds = await getOrgUserIds();
  const [group, client] = await Promise.all([
    db.familyGroup.findFirst({ where: { id: familyGroupId, ownerId: { in: orgUserIds }, deletedAt: null } }),
    db.client.findFirst({ where: { id: clientId, ownerId: { in: orgUserIds }, deletedAt: null } }),
  ]);
  if (!group) return { success: false, error: "Family group not found" };
  if (!client) return { success: false, error: "Client not found" };

  // Check if already linked
  const existing = await db.familyMember.findFirst({ where: { familyGroupId, linkedClientId: clientId } });
  if (existing) return { success: false, error: "Client already in this family" };

  await db.familyMember.create({
    data: {
      familyGroupId,
      fullName: client.fullName,
      relationship: relationship as any,
      phone: client.phone || null,
      email: client.email || null,
      linkedClientId: clientId,
      dependencyType: "INDEPENDENT",
    },
  });

  return { success: true };
}

export async function getFamilyGroupAUM(familyGroupId: string) {
  const members = await db.familyMember.findMany({
    where: { familyGroupId },
    include: { linkedClient: { select: { aum: true, fullName: true } } },
  });
  const totalAUM = members.reduce((sum, m) => {
    return sum + (m.linkedClient?.aum ? Number(m.linkedClient.aum) : 0);
  }, 0);
  return totalAUM;
}
