import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GMAIL_ADDRESS = "info@moneykonnect.in";
const COMPLAINT_REGISTER_LABEL_ID = "Label_8855910926228474100";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_GMAIL_CLIENT_ID!,
      client_secret: process.env.GOOGLE_GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return { accessToken: data.access_token as string, scope: data.scope as string };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authToken = await prisma.gmailAuthToken.findUnique({ where: { email: GMAIL_ADDRESS } });
  if (!authToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  const { accessToken, scope } = await refreshAccessToken(authToken.refreshToken);

  // Grab one real, already-flagged message ID to test against
  const oneEmail = await prisma.complianceEmail.findFirst({
    where: { isAutoSuggested: true },
    select: { gmailMessageId: true, subject: true },
  });
  if (!oneEmail) return NextResponse.json({ error: "No test email found" }, { status: 404 });

  const modifyRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${oneEmail.gmailMessageId}/modify`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds: [COMPLAINT_REGISTER_LABEL_ID] }),
    }
  );
  const modifyData = await modifyRes.json();

  return NextResponse.json({
    testedMessage: oneEmail.subject,
    grantedScopes: scope,
    modifyStatus: modifyRes.status,
    modifyResponse: modifyData,
  });
}
