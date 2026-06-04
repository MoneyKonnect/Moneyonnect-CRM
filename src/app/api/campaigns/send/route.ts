import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "info@moneykonnect.in",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function personalizeMessage(template: string, client: any): string {
  const aum = client.aum ? `₹${(Number(client.aum) / 10000000).toFixed(2)} Cr` : "N/A";
  return template
    .replace(/\{name\}/gi, client.fullName?.split(" ")[0] || "Valued Investor")
    .replace(/\{fullname\}/gi, client.fullName || "Valued Investor")
    .replace(/\{aum\}/gi, aum)
    .replace(/\{city\}/gi, client.city || "")
    .replace(/\{category\}/gi, client.category || "");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";

    const formData = await req.formData();
    const subject = formData.get("subject") as string;
    const body = formData.get("body") as string;
    const category = formData.get("category") as string;
    const residency = formData.get("residency") as string;
    const campaignName = formData.get("campaignName") as string;
    const ageFilter = formData.get("ageFilter") as string;
    const image = formData.get("image") as File | null;

    if (!subject || !body) return NextResponse.json({ error: "Subject and body required" }, { status: 400 });

    // Build recipient filter
    const where: any = { ownerId: userId, deletedAt: null, email: { not: null } };
    if (category && category !== "ALL") where.category = category;
    if (residency && residency !== "ALL") {
      where.residency = { some: { residencyType: residency } };
    }
    // Age filter
    if (ageFilter === "MINOR") {
      // Clients who have family members under 18
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      where.familyGroups = {
        some: {
          members: {
            some: { dob: { gt: eighteenYearsAgo }, deletedAt: null }
          }
        }
      };
    } else if (ageFilter === "SENIOR") {
      const sixtyYearsAgo = new Date();
      sixtyYearsAgo.setFullYear(sixtyYearsAgo.getFullYear() - 60);
      where.dob = { lte: sixtyYearsAgo };
    }

    const clients = await db.client.findMany({
      where,
      select: { id: true, fullName: true, email: true, aum: true, city: true, category: true },
      take: 500,
    });

    const validClients = clients.filter(c => c.email && c.email.includes("@"));
    if (!validClients.length) return NextResponse.json({ error: "No clients with email found for this filter" }, { status: 400 });

    // Prepare image attachment
    let attachments: any[] = [];
    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      attachments.push({
        filename: image.name,
        content: buffer,
        contentType: image.type,
      });
    }

    // Create campaign record
    const campaign = await db.campaign.create({
      data: {
        createdById: userId,
        name: campaignName || subject,
        channel: "EMAIL",
        template: body,
        status: "SENDING",
      },
    });

    // Send emails in batches of 10
    let sent = 0;
    let failed = 0;
    const BATCH = 10;

    for (let i = 0; i < validClients.length; i += BATCH) {
      const batch = validClients.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (client) => {
        try {
          const personalizedBody = personalizeMessage(body, client);
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <div style="background: #231f20; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: #3fd1b8; margin: 0; font-size: 20px;">MoneyKonnect</h2>
                <p style="color: #888; margin: 4px 0 0; font-size: 12px;">by Tayal Capital</p>
              </div>
              <div style="padding: 24px; background: #fff; border: 1px solid #eee;">
                ${personalizedBody.replace(/\n/g, "<br/>")}
              </div>
              <div style="padding: 16px; background: #f9f9f9; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
                <p style="margin: 0; font-size: 11px; color: #999;">
                  MoneyKonnect by Tayal Capital | info@moneykonnect.in | 
                  <a href="https://www.moneykonnect.in" style="color: #3fd1b8;">moneykonnect.in</a>
                </p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: '"MoneyKonnect" <info@moneykonnect.in>',
            to: client.email!,
            subject,
            html: htmlBody,
            attachments,
          });

          await db.campaignRecipient.create({
            data: { campaignId: campaign.id, clientId: client.id, status: "SENT", sentAt: new Date() },
          });
          sent++;
        } catch {
          await db.campaignRecipient.create({
            data: { campaignId: campaign.id, clientId: client.id, status: "FAILED" },
          });
          failed++;
        }
      }));

      // Small delay between batches to avoid Gmail rate limit
      if (i + BATCH < validClients.length) await new Promise(r => setTimeout(r, 500));
    }

    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: validClients.length,
      message: `Campaign sent! ${sent} emails delivered, ${failed} failed.`,
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
