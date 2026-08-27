import { NextRequest, NextResponse } from "next/server";

const COMPLAINT_LABEL_IDS = [
  "Label_880004551591226888",
  "Label_8855910926228474100",
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = "https://moneykonnect-crm.vercel.app";
  const results: any[] = [];

  for (const labelId of COMPLAINT_LABEL_IDS) {
    let pageToken: string | undefined;
    let totalInserted = 0;

    do {
      const res = await fetch(`${baseUrl}/api/compliance/import-labeled`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ labelId, pageToken }),
      });
      const data = await res.json();
      totalInserted += data.inserted || 0;
      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    results.push({ labelId, totalInserted });
  }

  return NextResponse.json({ ok: true, results });
}
