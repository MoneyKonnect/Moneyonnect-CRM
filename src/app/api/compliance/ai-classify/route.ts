import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GMAIL_ADDRESS = "info@moneykonnect.in";
const BATCH_SIZE = 20; // emails per Claude call
const FETCH_SIZE = 100; // emails fetched from Gmail per invocation

// Writing confirmed matches into COMPLAINT REGISTER specifically, per instruction.
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

async function applyGmailLabel(accessToken: string, messageId: string) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds: [COMPLAINT_REGISTER_LABEL_ID] }),
    }
  );
}

async function classifyBatch(items: { id: string; subject: string; snippet: string; from: string }[]) {
  const prompt = `You are reviewing emails for a wealth management firm's compliance register. For each email below, judge whether it is a GENUINE client complaint, grievance, query about an error/discrepancy, or a real operational problem needing follow-up — the same way a compliance officer would read it. This is NOT about specific keywords; read the actual meaning.

INCLUDE things like: a client saying something is wrong, missing, confusing, incorrect, sent to the wrong person, delayed without explanation, a transaction that failed/was rejected, a formal complaint or escalation.

EXCLUDE things like: routine transactional confirmations, marketing/newsletters, KYC reminders, generic "your report is ready" template emails with no follow-up problem, internal admin chatter with no client issue, empanelment/onboarding notices.

Respond with ONLY a JSON array, one object per email in the same order, each with: {"id": "...", "is_complaint": true/false, "reason": "one short phrase"}

Emails:
${items.map((e, i) => `${i + 1}. [id=${e.id}] From: ${e.from} | Subject: ${e.subject}\n${e.snippet.slice(0, 400)}`).join("\n\n")}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Claude API error: ${JSON.stringify(data)}`);

  const text = data.content?.[0]?.text || "[]";
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as { id: string; is_complaint: boolean; reason: string }[];
  } catch {
    console.error("Failed to parse Claude response:", text);
    return [];
  }
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

    const listParams = new URLSearchParams({ maxResults: String(FETCH_SIZE) });
    if (pageToken) listParams.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(`Gmail list failed: ${JSON.stringify(listData)}`);

    const messages: { id: string }[] = listData.messages || [];
    const nextPageToken: string | undefined = listData.nextPageToken;

    const existingIds = new Set(
      (await prisma.complianceEmail.findMany({
        where: { gmailMessageId: { in: messages.map((m) => m.id) } },
        select: { gmailMessageId: true },
      })).map((e) => e.gmailMessageId)
    );
    const toCheck = messages.filter((m) => !existingIds.has(m.id));

    // Fetch lightweight metadata in parallel
    const CONCURRENCY = 15;
    const metaResults: { id: string; subject: string; snippet: string; from: string; to: string; date: string }[] = [];
    for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
      const chunk = toCheck.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (m) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return null;
          const data = await res.json();
          const headers = data.payload?.headers || [];
          const body = extractBody(data.payload) || data.snippet || "";
          return {
            id: m.id,
            subject: getHeader(headers, "Subject") || "(no subject)",
            snippet: body || data.snippet || "",
            from: getHeader(headers, "From"),
            to: getHeader(headers, "To"),
            date: getHeader(headers, "Date"),
          };
        })
      );
      metaResults.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    let flagged = 0;
    const clients = await prisma.client.findMany({
      where: { deletedAt: null, email: { not: null } },
      select: { id: true, email: true },
    });
    const emailToClientId = new Map(
      clients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id])
    );

    // Classify in batches of BATCH_SIZE via Claude
    for (let i = 0; i < metaResults.length; i += BATCH_SIZE) {
      const chunk = metaResults.slice(i, i + BATCH_SIZE);
      const classifications = await classifyBatch(
        chunk.map((e) => ({ id: e.id, subject: e.subject, snippet: e.snippet, from: e.from }))
      );

      for (const cls of classifications) {
        if (!cls.is_complaint) continue;
        const email = chunk.find((e) => e.id === cls.id);
        if (!email) continue;

        const fromMatch = email.from.match(/<(.+?)>/);
        const fromAddress = (fromMatch ? fromMatch[1] : email.from).toLowerCase().trim();
        const fromNameMatch = email.from.match(/^"?([^"<]+)"?\s*</);
        const fromName = fromNameMatch ? fromNameMatch[1].trim() : null;
        const matchedClientId = emailToClientId.get(fromAddress) || null;

        try {
          await applyGmailLabel(accessToken, email.id);
        } catch (e) {
          console.error(`Label apply failed for ${email.id}:`, e);
        }

        await prisma.complianceEmail.create({
          data: {
            gmailMessageId: email.id,
            fromAddress,
            fromName,
            toAddress: email.to || null,
            subject: email.subject,
            bodySnippet: email.snippet.slice(0, 200),
            bodyFull: email.snippet.slice(0, 50000),
            receivedAt: email.date ? new Date(email.date) : new Date(),
            clientId: matchedClientId,
            matchedVia: matchedClientId ? "EMAIL_EXACT" : null,
            isAutoSuggested: true,
            matchedKeywords: `AI: ${cls.reason}`,
            category: "NEEDS_REVIEW",
          },
        });
        flagged++;
      }
    }

    return NextResponse.json({
      ok: true,
      processedInBatch: messages.length,
      checked: metaResults.length,
      flagged,
      nextPageToken: nextPageToken || null,
      done: !nextPageToken,
    });
  } catch (err) {
    console.error("AI compliance classify error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
