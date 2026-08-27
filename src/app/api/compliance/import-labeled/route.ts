import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GMAIL_ADDRESS = "info@moneykonnect.in";

// Your team's own manually-curated labels — treated as authoritative ground
// truth. Anything under these gets imported directly as a confirmed
// compliance record, no keyword guessing involved.
const COMPLAINT_LABEL_IDS = [
  "Label_880004551591226888",   // "compaints"
  "Label_8855910926228474100",  // "COMPLAINT REGISTER"
];

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
  return data.access_token as string;
}

function decodeBase64Url(str: string): string {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractBody(payload: any): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pageToken: string | undefined = body.pageToken;
  const labelId: string = body.labelId || COMPLAINT_LABEL_IDS[0];

  try {
    const authToken = await prisma.gmailAuthToken.findUnique({ where: { email: GMAIL_ADDRESS } });
    if (!authToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

    const accessToken = await refreshAccessToken(authToken.refreshToken);

    const listParams = new URLSearchParams({
      labelIds: labelId,
      maxResults: "50",
    });
    if (pageToken) listParams.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(`Gmail list failed: ${JSON.stringify(listData)}`);

    const messages: { id: string }[] = listData.messages || [];
    const nextPageToken: string | undefined = listData.nextPageToken;

    const clients = await prisma.client.findMany({
      where: { deletedAt: null, email: { not: null } },
      select: { id: true, email: true },
    });
    const emailToClientId = new Map(
      clients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id])
    );

    let inserted = 0, skipped = 0;

    for (const msg of messages) {
      const existing = await prisma.complianceEmail.findUnique({ where: { gmailMessageId: msg.id } });
      if (existing) {
        // Already imported — but if it was a keyword-guessed suggestion,
        // upgrade it to confirmed now that we know it's under a real label.
        if (existing.category === "NEEDS_REVIEW") {
          await prisma.complianceEmail.update({
            where: { id: existing.id },
            data: { category: "CONFIRMED_COMPLAINT", isAutoSuggested: false },
          });
        }
        skipped++;
        continue;
      }

      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detail = await detailRes.json();
      if (!detailRes.ok) continue;

      const headers = detail.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const toRaw = getHeader(headers, "To");
      const subject = getHeader(headers, "Subject") || "(no subject)";
      const dateRaw = getHeader(headers, "Date");

      const fromMatch = fromRaw.match(/<(.+?)>/);
      const fromAddress = (fromMatch ? fromMatch[1] : fromRaw).toLowerCase().trim();
      const fromNameMatch = fromRaw.match(/^"?([^"<]+)"?\s*</);
      const fromName = fromNameMatch ? fromNameMatch[1].trim() : null;

      const fullBody = extractBody(detail.payload) || detail.snippet || "";
      const snippet = detail.snippet || fullBody.slice(0, 200);

      const matchedClientId = emailToClientId.get(fromAddress) || null;

      await prisma.complianceEmail.create({
        data: {
          gmailMessageId: msg.id,
          threadId: detail.threadId || null,
          fromAddress,
          fromName,
          toAddress: toRaw || null,
          subject,
          bodySnippet: snippet,
          bodyFull: fullBody.slice(0, 50000),
          receivedAt: dateRaw ? new Date(dateRaw) : new Date(),
          clientId: matchedClientId,
          matchedVia: matchedClientId ? "EMAIL_EXACT" : null,
          isAutoSuggested: false,
          category: "CONFIRMED_COMPLAINT", // trusted — came from your team's own label
        },
      });
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      labelId,
      inserted,
      skipped,
      processedInBatch: messages.length,
      nextPageToken: nextPageToken || null,
      done: !nextPageToken,
    });
  } catch (err) {
    console.error("Compliance label import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
