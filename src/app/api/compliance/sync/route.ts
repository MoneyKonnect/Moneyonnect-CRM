import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GMAIL_ADDRESS = "info@moneykonnect.in";
const SYNC_START_DATE = "2022/01/01";
const BATCH_SIZE = 100; // emails fetched per invocation — small enough to stay well within timeout

// Words that trigger a "needs review" suggestion. Kept as a flat, auditable
// list — an auditor or advisor can see exactly why something got flagged,
// no black-box scoring.
// Layer 1: genuine signal words — must appear in subject or the OPENING of
// the email (not buried in a long body or footer/disclosure text).
const SIGNAL_KEYWORDS = [
  "complaint", "complain", "grievance", "issue", "query", "problem",
  "help", "escalate", "escalation", "dissatisfied", "unhappy",
  "disappointed", "not satisfied", "not resolved", "no response",
  "mistake", "discrepancy", "wrong amount", "compensation",
  "mis-sold", "misled", "fraud", "cheated", "legal action",
  "ombudsman", "consumer forum",
];

// Layer 2: must ALSO relate to an actual financial/transaction context —
// filters out generic complaints about unrelated things and confirms this
// is genuinely investment/account related.
const FINANCE_CONTEXT_KEYWORDS = [
  "scheme", "kyc", "re-kyc", "rekyc", "transaction", "redemption",
  "sip", "folio", "nomination", "nominee", "statement", "investment",
  "withdrawal", "portfolio", "fund", "account", "demat", "units",
  "nav", "switch", "purchase", "cheque", "bank details", "pan",
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

function isForwardedMessage(subject: string): boolean {
  return /^\s*(fwd?|fw)\s*:/i.test(subject);
}

function classifyEmail(subject: string, fullBody: string): { flagged: boolean; matchedKeywords: string[] } {
  // Forwarded messages relay content that ORIGINATED elsewhere (often a
  // company/vendor) — the client's own mailbox sent it, but the words
  // aren't the client's own complaint. Skip these entirely.
  if (isForwardedMessage(subject)) {
    return { flagged: false, matchedKeywords: [] };
  }

  const opening = (subject + " " + fullBody.slice(0, 300)).toLowerCase();
  const signalHits = SIGNAL_KEYWORDS.filter((kw) => opening.includes(kw));
  if (signalHits.length === 0) {
    return { flagged: false, matchedKeywords: [] };
  }

  // Must also relate to an actual financial/transaction context somewhere
  // in the email — confirms this is genuinely account/investment related,
  // not an unrelated personal message that happens to say "help" or "issue".
  const fullLower = (subject + " " + fullBody).toLowerCase();
  const contextHits = FINANCE_CONTEXT_KEYWORDS.filter((kw) => fullLower.includes(kw));
  if (contextHits.length === 0) {
    return { flagged: false, matchedKeywords: [] };
  }

  return { flagged: true, matchedKeywords: [...signalHits, ...contextHits] };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // Fixed calendar-month window, e.g. "2022-01" — stable regardless of how
  // much NEW mail keeps arriving elsewhere in the inbox. Raw pageToken-based
  // pagination alone doesn't work reliably on a live, high-volume mailbox:
  // each fresh call restarts from the newest message, so new automated mail
  // (KFintech/CAMS reports arrive constantly) keeps pushing the "top of the
  // list" forward and we'd never actually reach back to 2022.
  const monthParam: string | undefined = body.month; // "YYYY-MM"
  const pageToken: string | undefined = body.pageToken;

  const [startYear, startMonthNum] = monthParam
    ? monthParam.split("-").map(Number)
    : [2022, 1];
  const afterDate = `${startYear}/${String(startMonthNum).padStart(2, "0")}/01`;
  const nextMonthDate = new Date(startYear, startMonthNum, 1); // JS Date rolls over correctly
  const beforeDate = `${nextMonthDate.getFullYear()}/${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}/01`;

  try {
    const authToken = await prisma.gmailAuthToken.findUnique({
      where: { email: GMAIL_ADDRESS },
    });
    if (!authToken) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const accessToken = await refreshAccessToken(authToken.refreshToken);

    // List message IDs for this batch — bounded to a fixed calendar month
    const listParams = new URLSearchParams({
      q: `after:${afterDate} before:${beforeDate}`,
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

      const { flagged: isAutoSuggested, matchedKeywords: triggeredKeywords } = classifyEmail(subject, fullBody);

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

    const currentMonth = `${startYear}-${String(startMonthNum).padStart(2, "0")}`;
    const now = new Date();
    const isCurrentOrFutureMonth =
      startYear > now.getFullYear() ||
      (startYear === now.getFullYear() && startMonthNum > now.getMonth() + 1);

    return NextResponse.json({
      ok: true,
      month: currentMonth,
      inserted,
      skipped,
      flagged,
      processedInBatch: messages.length,
      nextPageToken: nextPageToken || null,
      monthComplete: !nextPageToken,
      // If this month is done AND it's not the current/future month, the
      // caller should advance to next month. Otherwise we've caught up to
      // "now" and the whole backfill is finished.
      nextMonth: !nextPageToken && !isCurrentOrFutureMonth
        ? (startMonthNum === 12 ? `${startYear + 1}-01` : `${startYear}-${String(startMonthNum + 1).padStart(2, "0")}`)
        : null,
      allDone: !nextPageToken && isCurrentOrFutureMonth,
    });
  } catch (err) {
    console.error("Compliance email sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
