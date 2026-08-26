import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GMAIL_ADDRESS = "info@moneykonnect.in";
const SYNC_START_DATE = "2022/01/01";
const BATCH_SIZE = 100; // emails fetched per invocation — small enough to stay well within timeout

// Words that trigger a "needs review" suggestion. Kept as a flat, auditable
// list — an auditor or advisor can see exactly why something got flagged,
// no black-box scoring.
const TRIGGER_KEYWORDS = [
  "complaint", "complain", "grievance", "escalate", "escalation",
  "dissatisfied", "unhappy", "disappointed", "not satisfied",
  "pending since", "no response", "not resolved",
  "wrong amount", "mistake", "discrepancy",
  "compensation", "mis-sold", "misled", "fraud", "cheated",
  "legal action", "ombudsman", "consumer forum",
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

function findTriggeredKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return TRIGGER_KEYWORDS.filter((kw) => lower.includes(kw));
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pageToken: string | undefined = body.pageToken;

  try {
    const authToken = await prisma.gmailAuthToken.findUnique({
      where: { email: GMAIL_ADDRESS },
    });
    if (!authToken) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const accessToken = await refreshAccessToken(authToken.refreshToken);

    // List message IDs for this batch
    const listParams = new URLSearchParams({
      q: `after:${SYNC_START_DATE}`,
      maxResults: String(BATCH_SIZE),
    });
    if (pageToken) listParams.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) {
      throw new Error(`Gmail list failed: ${JSON.stringify(listData)}`);
    }

    const messages: { id: string }[] = listData.messages || [];
    const nextPageToken: string | undefined = listData.nextPageToken;

    // Load all client emails once for matching
    const clients = await prisma.client.findMany({
      where: { deletedAt: null, email: { not: null } },
      select: { id: true, email: true },
    });
    const emailToClientId = new Map(
      clients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id])
    );

    let inserted = 0, skipped = 0, flagged = 0;

    for (const msg of messages) {
      const existing = await prisma.complianceEmail.findUnique({
        where: { gmailMessageId: msg.id },
      });
      if (existing) { skipped++; continue; }

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

      // Only consider emails that actually came FROM a known client's own
      // address. Vendor/registrar mail (KFintech, CAMS), our own outbound
      // newsletters, and AMC mailers all get skipped before we even look at
      // keywords — those are never a client complaint, no matter what words
      // appear in them.
      const matchedClientId = emailToClientId.get(fromAddress) || null;
      if (!matchedClientId) { skipped++; continue; }

      const fullBody = extractBody(detail.payload) || detail.snippet || "";
      const snippet = detail.snippet || fullBody.slice(0, 200);

      const triggeredKeywords = findTriggeredKeywords(subject + " " + fullBody);
      const isAutoSuggested = triggeredKeywords.length > 0;

      if (!isAutoSuggested) { skipped++; continue; }
      flagged++;

      await prisma.complianceEmail.create({
        data: {
          gmailMessageId: msg.id,
          threadId: detail.threadId || null,
          fromAddress,
          fromName,
          toAddress: toRaw || null,
          subject,
          bodySnippet: snippet,
          bodyFull: fullBody.slice(0, 50000), // sane cap on storage
          receivedAt: dateRaw ? new Date(dateRaw) : new Date(),
          clientId: matchedClientId,
          matchedVia: matchedClientId ? "EMAIL_EXACT" : null,
          isAutoSuggested,
          matchedKeywords: triggeredKeywords.length > 0 ? triggeredKeywords.join(", ") : null,
          category: isAutoSuggested ? "NEEDS_REVIEW" : "NEEDS_REVIEW",
        },
      });
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      flagged,
      processedInBatch: messages.length,
      nextPageToken: nextPageToken || null,
      done: !nextPageToken,
    });
  } catch (err) {
    console.error("Compliance email sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
