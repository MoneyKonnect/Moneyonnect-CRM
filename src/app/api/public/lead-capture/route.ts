import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGoogleAuth, sheetsRequest } from "@/lib/google";

const CORS_ORIGIN = "https://www.moneykonnect.in";
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_NAME = "Leads";
const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const HEADERS = [
  "ID", "Full Name", "Email", "Phone", "Stage", "Source",
  "Interest", "Residency", "Lead Value (₹)", "Owner",
  "Next Follow Up", "Created At", "Converted At", "Notes",
];

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

// Write lead directly to Google Sheets immediately
async function writeLeadToSheets(lead: any, ownerName: string) {
  try {
    const auth = getGoogleAuth();

    // Ensure header row exists
    await sheetsRequest(auth, "PUT",
      `${BASE}/${SHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=RAW`,
      { values: [HEADERS] }
    ).catch(() => {});

    // Append the new lead row
    const row = [
      lead.id,
      lead.fullName ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.stage ?? "NEW",
      lead.source ?? "WEBSITE",
      lead.interest ?? "",
      lead.residencyType ?? "",
      "",
      ownerName,
      "",
      new Date(lead.createdAt).toLocaleDateString("en-IN"),
      "",
      lead.notes ?? "",
    ];

    await sheetsRequest(auth, "POST",
      `${BASE}/${SHEET_ID}/values/${SHEET_NAME}!A:N:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: [row] }
    );

    console.log("✅ Lead written to Sheets:", lead.fullName);
  } catch (err) {
    // Never block lead capture if Sheets fails
    console.error("Sheets write error (non-blocking):", err);
  }
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

    // Find the default advisor to assign lead to
    const advisor = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!advisor) {
      return cors(NextResponse.json({ success: false, error: "No advisor found" }, { status: 500 }));
    }

    // Create lead in Supabase
    const lead = await (db.lead.create as any)({
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
    await (db.leadActivity.create as any)({
      data: {
        leadId: lead.id,
        type: "CREATED",
        note: `Lead captured from website. Interest: ${interest || "Not specified"}. Residency: ${residencyType || "RESIDENT"}`,
      },
    }).catch(() => {});

    // Create smart alert for advisor
    await (db.smartAlert.create as any)({
      data: {
        ownerId: advisor.id,
        alertType: "KYC_EXPIRY",
        title: `🌐 New Website Lead — ${fullName}`,
        body: `${fullName} submitted a form on moneykonnect.in. Interest: ${interest === "Other" ? (otherInterest || "Other") : (interest || "Not specified")}. ${residencyType === "NRI" ? "🌍 NRI Lead" : ""}`,
        metadata: { leadId: lead.id, source: "WEBSITE", interest, residencyType },
      },
    }).catch(() => {});

    // Write to Google Sheets IMMEDIATELY (non-blocking but happens right away)
    writeLeadToSheets(lead, advisor.name || advisor.email || "Advisor");

    return cors(NextResponse.json({ success: true, leadId: lead.id }));
  } catch (error) {
    console.error("Lead capture error:", error);
    return cors(NextResponse.json({ success: false, error: "Internal error" }, { status: 500 }));
  }
}
