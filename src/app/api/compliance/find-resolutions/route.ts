import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GMAIL_ADDRESS = "info@moneykonnect.in";

// Gmail search query — narrow, high-precision phrases that specifically
// confirm something got resolved, not just any complaint-adjacent word.
const RESOLUTION_QUERY = '("issue resolved" OR "issue is resolved" OR "resolved now" OR "now resolved" OR "thank you for resolving" OR "problem solved" OR "matter is resolved" OR "closed the issue" OR "sorted now" OR "resolved the issue")';

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

  try {
    const authToken = await prisma.gmailAuthToken.findUnique({ where: { email: GMAIL_ADDRESS } });
    if (!authToken) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

    const accessToken = await refreshAccessToken(authToken.refreshToken);

    const listParams = new URLSearchParams({ q: RESOLUTION_QUERY, maxResults: "50" });
    if (pageToken) listParams.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(`Gmail search failed: ${JSON.stringify(listData)}`);

    const messages: { id: string; threadId?: string }[] = listData.messages || [];
    const nextPageToken: string | undefined = listData.nextPageToken;

    const clients = await prisma.client.findMany({
      where: { deletedAt: null, email: { not: null } },
      select: { id: true, email: true, fullName: true },
    });
    const emailToClient = new Map(
      clients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c])
    );

    const results: any[] = [];

    for (const msg of messages) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detail = await detailRes.json();
      if (!detailRes.ok) continue;

      const headers = detail.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const subject = getHeader(headers, "Subject") || "(no subject)";
      const dateRaw = getHeader(headers, "Date");
      const fromMatch = fromRaw.match(/<(.+?)>/);
      const fromAddress = (fromMatch ? fromMatch[1] : fromRaw).toLowerCase().trim();
      const client = emailToClient.get(fromAddress);
      const body = extractBody(detail.payload) || detail.snippet || "";

      results.push({
        gmailMessageId: msg.id,
        threadId: detail.threadId,
        subject,
        from: fromRaw,
        matchedClient: client?.fullName || null,
        date: dateRaw,
        snippet: body.slice(0, 300),
      });
    }

    return NextResponse.json({
      ok: true,
      found: results.length,
      results,
      nextPageToken: nextPageToken || null,
      done: !nextPageToken,
    });
  } catch (err) {
    console.error("Find resolutions error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
