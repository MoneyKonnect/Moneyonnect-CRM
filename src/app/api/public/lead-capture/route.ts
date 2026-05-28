import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CORS_ORIGIN = "https://www.moneykonnect.in";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, residencyType, interest, otherInterest, source } = body;

    if (!fullName || fullName.trim().length < 2) {
      return cors(NextResponse.json({ success: false, error: "Name is required" }, { status: 400 }));
    }
    if (!email && !phone) {
      return cors(NextResponse.json({ success: false, error: "Email or phone required" }, { status: 400 }));
    }

    // Find the default advisor (first user) to assign lead to
    const advisor = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!advisor) {
      return cors(NextResponse.json({ success: false, error: "No advisor found" }, { status: 500 }));
    }

    // Create lead
    const lead = await db.lead.create({
      data: {
        fullName: fullName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        residencyType: residencyType || "RESIDENT",
        interest: interest?.trim() || null,
        otherInterest: interest === "Other" ? (otherInterest?.trim() || null) : null,
        source: "WEBSITE",
        stage: "NEW",
        ownerId: advisor.id,
        score: residencyType === "NRI" ? 70 : 50,
        notes: interest ? `Interested in: ${interest === "Other" ? (otherInterest || interest) : interest}` : null,
      },
    });

    // Log activity
    await db.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "CREATED",
        note: `Lead captured from website. Interest: ${interest || "Not specified"}. Residency: ${residencyType || "RESIDENT"}`,
      },
    });

    // Create smart alert for advisor
    await db.smartAlert.create({
      data: {
        ownerId: advisor.id,
        alertType: "KYC_EXPIRY",
        title: `🌐 New Website Lead — ${fullName}`,
        body: `${fullName} submitted a form on moneykonnect.in. Interest: ${interest === "Other" ? (otherInterest || "Other") : (interest || "Not specified")}. ${residencyType === "NRI" ? "🌍 NRI Lead" : ""}`,
        metadata: { leadId: lead.id, source: "WEBSITE", interest, residencyType },
      },
    });

    // Trigger Google Sheets sync in background (non-blocking)
    try {
      const baseUrl = process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      fetch(`${baseUrl}/api/sync/leads-to-sheets`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {}); // fire and forget
    } catch (_) {}

    return cors(NextResponse.json({ success: true, leadId: lead.id }));
  } catch (error) {
    console.error("Lead capture error:", error);
    return cors(NextResponse.json({ success: false, error: "Internal error" }, { status: 500 }));
  }
}
