import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { distance as levenshtein } from "fastest-levenshtein";

const prisma = new PrismaClient();

const DONE_LIST_ID = "651d25938479aa0f01f8d8da";
const FALLBACK_USER_EMAIL = "aditya.anthwal@moneykonnect.in";
const FUZZY_MAX_RATIO = 0.2;
const PAN_REGEX = /[A-Z]{5}[0-9]{4}[A-Z]/g;

const MEMBER_EMAIL_MAP: Record<string, string> = {
  "688ca8ef24e0c624820ca9b7": "aditya.anthwal@moneykonnect.in",
  "671238636e02dc437c6962ef": "ayushi.rathor@moneykonnect.in",
  "651d2980ffdf227a557e7de3": "barendra.behera@moneykonnect.in",
  "651d2467b1d33153ae308aed": "mrigank.tayal@moneykonnect.in",
  "6970b4db71b438310a6a602d": "aman.srivastva@moneykonnect.in",
};

const SKIP_CARD_NAMES = new Set(["AJAY GUPTA"]);

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}
function extractPan(t: string) {
  return t.toUpperCase().match(PAN_REGEX)?.[0] || null;
}
function titleCandidates(raw: string): string[] {
  const out: string[] = [];
  const trimmed = raw.trim();
  out.push(trimmed);
  const dash = trimmed.split(/\s*[-–—]\s*/)[0].trim();
  if (dash && dash !== trimmed && dash.length >= 3) out.push(dash);
  const amp = trimmed.split(/\s*&\s*/)[0].trim();
  if (amp && !out.includes(amp) && amp.length >= 3) out.push(amp);
  const words = dash.split(/\s+/).filter(Boolean);
  for (let len = words.length - 1; len >= 2; len--) {
    const c = words.slice(0, len).join(" ");
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

function verifyTrelloSignature(body: string, signature: string | null, callbackUrl: string): boolean {
  const secret = process.env.TRELLO_API_SECRET;
  if (!secret || !signature) return false;
  const base = body + callbackUrl;
  const expected = crypto.createHmac("sha1", secret).update(base).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-trello-webhook");
  const callbackUrl = `${process.env.NEXTAUTH_URL || "https://moneykonnect-crm.vercel.app"}/api/webhooks/trello`;
  const verified = verifyTrelloSignature(rawBody, signature, callbackUrl);

  if (!verified) {
    console.error("Trello webhook: signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = payload?.action;
  if (!action || action.type !== "updateCard") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const listAfter = action.data?.listAfter;
  if (!listAfter || listAfter.id !== DONE_LIST_ID) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const cardId = action.data?.card?.id;
  if (!cardId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const cardRes = await fetch(
      `https://api.trello.com/1/cards/${cardId}?key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_API_TOKEN}&fields=name,desc,due,dateLastActivity&members=true&member_fields=id`
    );
    if (!cardRes.ok) {
      console.error(`Trello webhook: failed to fetch card ${cardId}`, await cardRes.text());
      return NextResponse.json({ error: "Failed to fetch card" }, { status: 502 });
    }
    const card = await cardRes.json();
    const cardName: string = card.name || "";
    const cardDesc: string = card.desc || "";
    const idMembers: string[] = (card.members || []).map((m: any) => m.id);
    const cardDate = new Date(card.due || card.dateLastActivity);

    const existing = await prisma.interaction.findFirst({
      where: { meetingWith: `trello:${cardId}` },
    });
    if (existing) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    if (SKIP_CARD_NAMES.has(cardName.trim())) {
      return NextResponse.json({ ok: true, skipped: "manually excluded" });
    }

    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, pan: true },
    });
    const idx = clients.map((c) => ({ ...c, normName: norm(c.fullName) }));
    const panIdx = new Map(clients.filter((c) => c.pan).map((c) => [c.pan!.toUpperCase(), c.id]));

    const pan = extractPan(cardDesc);
    let clientId: string | null = null;
    let via: string | null = null;

    if (pan && panIdx.has(pan)) {
      clientId = panIdx.get(pan)!;
      via = "PAN";
    }

    if (!clientId) {
      outer: for (const candidate of titleCandidates(cardName)) {
        const nt = norm(candidate);
        if (nt.length < 3) continue;
        const exact = idx.filter((c) => c.normName === nt);
        if (exact.length === 1) {
          clientId = exact[0].id;
          via = "NAME_EXACT";
          break outer;
        }
        if (exact.length > 1) break outer;
        if (nt.length >= 4) {
          const tw = nt.split(" ").filter(Boolean);
          const ts = tw[tw.length - 1] || "";
          const scored = idx
            .map((c) => {
              const d = levenshtein(nt, c.normName);
              const ratio = d / Math.max(nt.length, c.normName.length);
              const cw = c.normName.split(" ").filter(Boolean);
              const cs = cw[cw.length - 1] || "";
              const sd = levenshtein(ts, cs);
              const sr = ts && cs ? sd / Math.max(ts.length, cs.length) : 1;
              return { ...c, ratio, sr };
            })
            .filter((c) => c.ratio <= FUZZY_MAX_RATIO && c.sr <= 0.3)
            .sort((a, b) => a.ratio - b.ratio);
          if (scored.length === 1) {
            clientId = scored[0].id;
            via = "NAME_FUZZY";
            break outer;
          }
          if (scored.length > 1) break outer;
        }
      }
    }

    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const byEmail = new Map(users.map((u) => [u.email, u.id]));
    const fallbackUserId = byEmail.get(FALLBACK_USER_EMAIL) || users[0]?.id || "";

    function resolveUser(): string {
      for (const mid of idMembers) {
        const uid = byEmail.get(MEMBER_EMAIL_MAP[mid] || "");
        if (uid) return uid;
      }
      return fallbackUserId;
    }

    if (clientId && via) {
      await prisma.interaction.create({
        data: {
          userId: resolveUser(),
          clientId,
          channel: "TRELLO_TASK",
          direction: "OUTBOUND",
          summary: cardDesc.trim() || `Trello task completed: ${cardName}`,
          occurredAt: cardDate,
          meetingWith: `trello:${cardId}`,
        },
      });
      return NextResponse.json({ ok: true, linked: true, clientId, via });
    } else {
      await prisma.smartAlert.create({
        data: {
          ownerId: fallbackUserId,
          alertType: "TRELLO_UNMATCHED",
          title: "Trello card needs manual review",
          body: `"${cardName}" moved to Done but couldn't be matched to a client automatically.`,
          metadata: {
            trelloCardId: cardId,
            trelloCardName: cardName,
            trelloCardDesc: cardDesc,
          },
        },
      });
      return NextResponse.json({ ok: true, needsReview: true });
    }
  } catch (err) {
    console.error("Trello webhook processing error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
