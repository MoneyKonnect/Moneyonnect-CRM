// src/app/api/sync/leads-to-sheets/route.ts
// Called by Vercel Cron: every hour + on every new lead
// Also callable manually from /settings

import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getGoogleAuth, getSheetsClient } from "@/lib/google";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_NAME = "Leads";

const HEADERS = [
  "ID",
  "Full Name",
  "Email",
  "Phone",
  "Stage",
  "Source",
  "Interest",
  "Residency",
  "Lead Value (₹)",
  "Owner",
  "Next Follow Up",
  "Created At",
  "Converted At",
  "Notes",
];

export async function GET(req: Request) {
  // Secure the cron endpoint
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
      where: { deletedAt: null },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const auth = getGoogleAuth();
    const sheets = getSheetsClient(auth);

    // Clear existing data (keep header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:Z`,
    });

    // Ensure header row exists
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });

    if (leads.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const rows = leads.map((lead) => [
      lead.id,
      lead.fullName ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.stage ?? "",
      lead.source ?? "",
      lead.interest ?? "",
      lead.residencyType ?? "",
      (lead as any).estimatedValue ? String((lead as any).estimatedValue) : "",
      lead.owner?.name ?? lead.owner?.email ?? "",
      lead.nextFollowUpAt
        ? new Date(lead.nextFollowUpAt).toLocaleDateString("en-IN")
        : "",
      new Date(lead.createdAt).toLocaleDateString("en-IN"),
      lead.convertedAt
        ? new Date(lead.convertedAt).toLocaleDateString("en-IN")
        : "",
      lead.notes ?? "",
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });

    // Auto-resize columns
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: HEADERS.length,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      synced: leads.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Sheets sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
