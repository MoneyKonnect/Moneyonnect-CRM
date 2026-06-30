"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getOrgUserIds } from "@/lib/org";
import { sendBirthdayWishEmail } from "@/lib/email";

// ─── Alert Generator ────────────────────────────────────────────────────────
// Call this on login or daily cron — generates smart alerts from real data

export async function generateSmartAlerts() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const userId = (session.user as any).id ?? "";
    const orgUserIds = await getOrgUserIds();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next30 = new Date(today.getTime() + 30 * 86400000);
    const next7 = new Date(today.getTime() + 7 * 86400000);

    const alertsToCreate: any[] = [];

    // ── 1. Client Birthdays (next 30 days) ─────────────────────────────────
    const clientsWithDob = await db.client.findMany({
      where: { ownerId: { in: orgUserIds }, deletedAt: null, dob: { not: null } },
      select: { id: true, fullName: true, dob: true },
    });

    for (const client of clientsWithDob) {
      if (!client.dob) continue;
      const dob = new Date(client.dob);
      const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      if (thisYearBirthday < today) thisYearBirthday.setFullYear(now.getFullYear() + 1);
      const daysUntil = Math.floor((thisYearBirthday.getTime() - today.getTime()) / 86400000);
      if (daysUntil <= 30) {
        const age = now.getFullYear() - dob.getFullYear() + (thisYearBirthday.getFullYear() > now.getFullYear() ? 0 : 0);
        alertsToCreate.push({
          ownerId: userId,
          clientId: client.id,
          alertType: "BIRTHDAY",
          title: `🎂 ${client.fullName}'s Birthday`,
          body: daysUntil === 0 ? `Today is ${client.fullName}'s birthday!` : `Birthday in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          dueDate: thisYearBirthday,
          metadata: { clientName: client.fullName, daysUntil, age },
        });
      }
    }

    // ── 2. Family Member Birthdays (next 30 days) ──────────────────────────
    const familyGroups = await db.familyGroup.findMany({
      where: { ownerId: { in: orgUserIds }, deletedAt: null },
      include: {
        members: {
          where: { dob: { not: null } },
          select: { id: true, fullName: true, dob: true, lifeStage: true, familyGroupId: true },
        },
        headClient: { select: { id: true } },
      },
    });

    for (const group of familyGroups) {
      for (const member of group.members) {
        if (!member.dob) continue;
        const dob = new Date(member.dob);
        const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYearBirthday < today) thisYearBirthday.setFullYear(now.getFullYear() + 1);
        const daysUntil = Math.floor((thisYearBirthday.getTime() - today.getTime()) / 86400000);
        
        if (daysUntil <= 30) {
          alertsToCreate.push({
            ownerId: userId,
            clientId: group.headClientId || null,
            memberId: member.id,
            alertType: "BIRTHDAY",
            title: `🎂 ${member.fullName}'s Birthday`,
            body: daysUntil === 0 
              ? `Today is ${member.fullName}'s birthday!` 
              : `${member.fullName} (family member) birthday in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
            dueDate: thisYearBirthday,
            metadata: { memberName: member.fullName, daysUntil, familyGroup: group.name },
          });
        }

        // ── 3. Age-18 Alert ──────────────────────────────────────────────
        const ageNow = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 86400000));
        if (ageNow >= 17 && ageNow < 18) {
          const eighteenthBirthday = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
          const daysTo18 = Math.floor((eighteenthBirthday.getTime() - today.getTime()) / 86400000);
          if (daysTo18 <= 90) {
            alertsToCreate.push({
              ownerId: userId,
              clientId: group.headClientId || null,
              memberId: member.id,
              alertType: "AGE_18",
              title: `🎓 ${member.fullName} turns 18 soon`,
              body: `${member.fullName} turns 18 in ${daysTo18} days — consider converting to a lead or standalone client profile.`,
              dueDate: eighteenthBirthday,
              metadata: { memberName: member.fullName, daysTo18 },
            });
          }
        }
      }
    }

    // ── 4. Investment Maturity (next 30 days) ──────────────────────────────
    const maturingInvestments = await db.investment.findMany({
      where: {
        client: { ownerId: { in: orgUserIds } },
        maturityDate: { gte: today, lte: next30 },
        status: "ACTIVE",
      },
      include: { client: { select: { id: true, fullName: true } } },
    });

    for (const inv of maturingInvestments) {
      if (!inv.maturityDate) continue;
      const daysUntil = Math.floor((inv.maturityDate.getTime() - today.getTime()) / 86400000);
      alertsToCreate.push({
        ownerId: userId,
        clientId: inv.clientId,
        alertType: "INVESTMENT_MATURITY",
        title: `💰 Investment maturing — ${inv.client.fullName}`,
        body: `${inv.schemeName} (₹${Number(inv.amount).toLocaleString("en-IN")}) matures in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. Schedule a reinvestment discussion.`,
        dueDate: inv.maturityDate,
        metadata: { investmentName: inv.schemeName, amount: Number(inv.amount), clientName: inv.client.fullName, daysUntil },
      });
    }

    // ── 5. Document Expiry (next 30 days) ──────────────────────────────────
    const expiringDocs = await db.document.findMany({
      where: {
        client: { ownerId: { in: orgUserIds } },
        expiresAt: { gte: today, lte: next30 },
      },
      include: { client: { select: { id: true, fullName: true } } },
    });

    for (const doc of expiringDocs) {
      if (!doc.expiresAt) continue;
      const daysUntil = Math.floor((doc.expiresAt.getTime() - today.getTime()) / 86400000);
      alertsToCreate.push({
        ownerId: userId,
        clientId: doc.clientId,
        alertType: "KYC_EXPIRY",
        title: `📄 Document expiring — ${doc.client.fullName}`,
        body: `${doc.docType} document (${doc.fileName}) expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. Collect updated document.`,
        dueDate: doc.expiresAt,
        metadata: { docType: doc.docType, fileName: doc.fileName, clientName: doc.client.fullName, daysUntil },
      });
    }

    // ── 6. Overdue follow-ups ──────────────────────────────────────────────
    const overdueLeads = await db.lead.findMany({
      where: {
        ownerId: { in: orgUserIds },
        deletedAt: null,
        nextFollowUpAt: { lt: today },
        stage: { notIn: ["CONVERTED", "LOST"] },
      },
      select: { id: true, fullName: true, nextFollowUpAt: true, stage: true },
      take: 10,
    });

    for (const lead of overdueLeads) {
      if (!lead.nextFollowUpAt) continue;
      const daysOverdue = Math.floor((today.getTime() - lead.nextFollowUpAt.getTime()) / 86400000);
      alertsToCreate.push({
        ownerId: userId,
        alertType: "KYC_EXPIRY", // reusing type
        title: `⏰ Overdue follow-up — ${lead.fullName}`,
        body: `Follow-up with ${lead.fullName} was due ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} ago (Stage: ${lead.stage.replace(/_/g, " ")})`,
        dueDate: lead.nextFollowUpAt,
        metadata: { leadName: lead.fullName, daysOverdue, stage: lead.stage, leadId: lead.id },
      });
    }

    // ── Smart dedup: only create alerts that don't already exist ──────────
    // Never delete existing alerts - respect user deletions
    if (alertsToCreate.length > 0) {
      for (const alert of alertsToCreate) {
        // Check if this exact alert already exists (by type + client + same week)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        
        const existing = await db.smartAlert.findFirst({
          where: {
            ownerId: { in: orgUserIds },
            alertType: alert.alertType,
            clientId: alert.clientId ?? null,
            memberId: alert.memberId ?? null,
            createdAt: { gte: weekStart }, // only check alerts from last 7 days
          },
        });
        
        // Skip if already exists (whether deleted or not)
        if (!existing) {
          await db.smartAlert.create({ data: alert });
        }
      }
    }

    return { success: true, count: alertsToCreate.length };
  } catch (error) {
    console.error("generateSmartAlerts error:", error);
    return { success: false };
  }
}

export async function getSmartAlerts() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    const orgUserIds = await getOrgUserIds();

    return db.smartAlert.findMany({
      where: { ownerId: { in: orgUserIds }, isDeleted: false },
      orderBy: [{ isRead: "asc" }, { dueDate: "asc" }],
      take: 50,
    });
  } catch { return []; }
}

export async function markAlertRead(alertId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    await db.smartAlert.update({ where: { id: alertId }, data: { isRead: true } });
    revalidatePath("/notifications");
    return { success: true };
  } catch { return { success: false }; }
}

export async function markAlertActioned(alertId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    await db.smartAlert.update({ where: { id: alertId }, data: { isActioned: true, isRead: true } });
    revalidatePath("/notifications");
    return { success: true };
  } catch { return { success: false }; }
}

export async function markAllAlertsRead() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const orgUserIds = await getOrgUserIds();
    await db.smartAlert.updateMany({ where: { ownerId: { in: orgUserIds }, isRead: false }, data: { isRead: true } });
    revalidatePath("/notifications");
    return { success: true };
  } catch { return { success: false }; }
}

// ─── Referral Intelligence ───────────────────────────────────────────────────

export async function getReferralTree(clientId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    const orgUserIds = await getOrgUserIds();

    const client = await db.client.findFirst({
      where: { id: clientId, ownerId: { in: orgUserIds }, deletedAt: null },
      include: {
        referredBy: { select: { id: true, fullName: true, category: true } },
        referrals: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, category: true, aum: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) return null;

    // Count total AUM from referrals
    const referralAUM = client.referrals.reduce((sum, r) => sum + (r.aum ? Number(r.aum) : 0), 0);
    
    return { client, referralAUM, referralCount: client.referrals.length };
  } catch { return null; }
}

export async function setReferredBy(clientId: string, referredById: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    
    if (clientId === referredById) return { success: false, error: "Client cannot refer themselves" };
    
    await db.client.update({
      where: { id: clientId },
      data: { referredById },
    });
    revalidatePath(`/clients/${clientId}`);
    return { success: true };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Risk Profiling ──────────────────────────────────────────────────────────

export async function saveRiskProfile(clientId: string, answers: Record<string, any>, score: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Determine risk result from score
    let riskResult: string;
    if (score <= 25) riskResult = "CONSERVATIVE";
    else if (score <= 50) riskResult = "MODERATE";
    else if (score <= 75) riskResult = "AGGRESSIVE";
    else riskResult = "VERY_AGGRESSIVE";

    await db.riskProfileAnswer.upsert({
      where: { clientId },
      create: { clientId, answers, score, riskResult },
      update: { answers, score, riskResult },
    });

    // Update client risk appetite
    await db.client.update({
      where: { id: clientId },
      data: { riskAppetite: riskResult as any },
    });

    revalidatePath(`/clients/${clientId}`);
    return { success: true, riskResult, score };
  } catch { return { success: false, error: "Failed to save risk profile" }; }
}

// ─── AUM Analytics ──────────────────────────────────────────────────────────

export async function getAumGrowthData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    const orgUserIds = await getOrgUserIds();

    const clients = await db.client.findMany({
      where: { ownerId: { in: orgUserIds }, deletedAt: null, aum: { not: null } },
      select: { id: true, fullName: true, aum: true, category: true, createdAt: true },
      orderBy: { aum: "desc" },
    });

    const totalAum = clients.reduce((sum: number, c: any) => sum + Number(c.aum || 0), 0);
    const byCategory = clients.reduce((acc: Record<string, {count:number;aum:number}>, c: any) => {
      if (!acc[c.category]) acc[c.category] = { count: 0, aum: 0 };
      acc[c.category].count += 1;
      acc[c.category].aum += Number(c.aum || 0);
      return acc;
    }, {} as Record<string, {count:number;aum:number}>);

    return { totalAum, byCategory, topClients: clients.slice(0, 5), totalClients: clients.length };
  } catch { return null; }
}

// ─── Birthday Calendar ───────────────────────────────────────────────────────

export async function getBirthdayCalendar(month: number, year: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    const orgUserIds = await getOrgUserIds();

    const [clients, familyMembers] = await Promise.all([
      db.client.findMany({
        where: { ownerId: { in: orgUserIds }, deletedAt: null, dob: { not: null } },
        select: { id: true, fullName: true, dob: true, category: true, email: true, phone: true },
      }),
      db.familyMember.findMany({
        where: {
          familyGroup: { ownerId: { in: orgUserIds }, deletedAt: null },
          dob: { not: null },
        },
        include: {
          familyGroup: true,
        },
      }),
    ]);

    const birthdays: any[] = [];

    for (const c of clients) {
      if (!c.dob) continue;
      const dob = new Date(c.dob);
      if (dob.getMonth() === month) {
        birthdays.push({
          id: c.id,
          name: c.fullName,
          day: dob.getDate(),
          type: "CLIENT",
          category: c.category,
          age: year - dob.getFullYear(),
          clientId: c.id,
          email: c.email,
          phone: c.phone,
        });
      }
    }

    for (const m of familyMembers as any[]) {
      if (!m.dob) continue;
      const dob = new Date(m.dob);
      if (dob.getMonth() === month) {
        birthdays.push({
          id: m.id,
          name: m.fullName,
          day: dob.getDate(),
          type: "FAMILY_MEMBER",
          relationship: m.relationship,
          age: year - dob.getFullYear(),
          clientId: m.familyGroup?.headClientId,
          familyGroupName: m.familyGroup?.name,
          email: m.email || null,
          phone: m.phone || null,
        });
      }
    }

    return birthdays.sort((a, b) => a.day - b.day);
  } catch { return []; }
}

export async function deleteAlert(alertId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const orgUserIds = await getOrgUserIds();
    const existing = await db.smartAlert.findFirst({ where: { id: alertId, ownerId: { in: orgUserIds } } });
    if (!existing) return { success: false };
    // Soft delete - mark as deleted so it never regenerates
    await db.smartAlert.update({ 
      where: { id: alertId },
      data: { isDeleted: true, isRead: true }
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deleteAllReadAlerts() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false };
    const orgUserIds = await getOrgUserIds();
    // Soft delete all read alerts
    await db.smartAlert.updateMany({ 
      where: { ownerId: { in: orgUserIds }, isRead: true },
      data: { isDeleted: true }
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deduplicateAlerts() {
  try {
    const session = await auth();
    if (!session?.user?.id) return;
    const orgUserIds = await getOrgUserIds();

    // Get all non-deleted alerts grouped by type+client+member
    const alerts = await db.smartAlert.findMany({
      where: { ownerId: { in: orgUserIds }, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });

    // Find duplicates: same alertType + same clientId + same memberId
    const seen = new Map<string, string>();
    const toDelete: string[] = [];

    for (const alert of alerts) {
      const key = `${alert.alertType}:${alert.clientId ?? ""}:${alert.memberId ?? ""}`;
      if (seen.has(key)) {
        // Keep the oldest, delete the newer duplicate
        toDelete.push(alert.id);
      } else {
        seen.set(key, alert.id);
      }
    }

    if (toDelete.length > 0) {
      await db.smartAlert.deleteMany({ where: { id: { in: toDelete } } });
    }

    revalidatePath("/notifications");
  } catch { /* silent */ }
}


export async function sendBirthdayWish(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const to = formData.get("to") as string;
    const name = formData.get("name") as string;
    const message = formData.get("message") as string;
    const file = formData.get("attachment") as File | null;

    if (!to || !name || !message?.trim()) {
      return { success: false, error: "Missing required fields" };
    }

    let attachment: { filename: string; content: Buffer } | null = null;
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      attachment = {
        filename: file.name,
        content: Buffer.from(arrayBuffer),
      };
    }

    await sendBirthdayWishEmail({ to, name, message: message.trim(), attachment });

    return { success: true };
  } catch (e) {
    console.error("sendBirthdayWish error:", e);
    return { success: false, error: "Failed to send email" };
  }
}
