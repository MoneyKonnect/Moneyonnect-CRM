import { NextRequest, NextResponse } from "next/server";
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

interface TrelloCard {
  id: string; name: string; desc: string;
  due: string | null; dateLastActivity: string;
  idMembers: string[];
}

async function fetchDoneCards(): Promise<TrelloCard[]> {
  // Only fetch cards that have moved/changed within the last 48 hours —
  // this runs daily, so a 48h window gives a safety buffer without ever
  // re-scanning the board's full multi-thousand-card history every time.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const seen = new Map<string, TrelloCard>();
  let before: string | undefined;
  let page = 0;
  const MAX_PAGES = 5;

  while (page < MAX_PAGES) {
    page++;
    const params = new URLSearchParams({
      key: process.env.TRELLO_API_KEY!,
      token: process.env.TRELLO_API_TOKEN!,
      fields: "name,desc,due,dateLastActivity",
      members: "true",
      member_fields: "id",
      limit: "1000",
      sort: "-id",
      since,
    });
    if (before) params.set("before", before);

    const res = await fetch(`https://api.trello.com/1/lists/${DONE_LIST_ID}/cards?${params}`);
    if (!res.ok) throw new Error(`Trello fetch failed: ${res.status}`);
    const batch: any[] = await res.json();
    if (batch.length === 0) break;

    let newCount = 0;
    for (const c of batch) {
      const card: TrelloCard = {
        id: c.id, name: c.name, desc: c.desc,
        due: c.due, dateLastActivity: c.dateLastActivity,
        idMembers: (c.members || []).map((m: any) => m.id),
      };
      if (!seen.has(card.id)) { seen.set(card.id, card); newCount++; }
    }
    if (newCount === 0) break;
    before = batch[batch.length - 1].id;
    if (batch.length < 1000) break;
  }
  return Array.from(seen.values());
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  let linked = 0, review = 0, skipped = 0;

  try {
    const doneCards = await fetchDoneCards();

    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, pan: true },
    });
    const idx = clients.map((c) => ({ ...c, normName: norm(c.fullName) }));
    const panIdx = new Map(clients.filter((c) => c.pan).map((c) => [c.pan!.toUpperCase(), c.id]));

    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const byEmail = new Map(users.map((u) => [u.email, u.id]));
    const fallbackUserId = byEmail.get(FALLBACK_USER_EMAIL) || users[0]?.id || "";

    const existing = await prisma.interaction.findMany({
      where: { meetingWith: { startsWith: "trello:" } },
      select: { meetingWith: true },
    });
    const alreadyDone = new Set(existing.map((i) => i.meetingWith!.replace("trello:", "")));

    for (const card of doneCards) {
      if (alreadyDone.has(card.id)) { skipped++; continue; }
      if (SKIP_CARD_NAMES.has(card.name.trim())) { review++; continue; }

      const cardDate = new Date(card.due || card.dateLastActivity);
      const pan = extractPan(card.desc || "");
      let clientId: string | null = null;
      let via: string | null = null;

      if (pan && panIdx.has(pan)) { clientId = panIdx.get(pan)!; via = "PAN"; }

      if (!clientId) {
        outer: for (const candidate of titleCandidates(card.name)) {
          const nt = norm(candidate);
          if (nt.length < 3) continue;
          const exact = idx.filter((c) => c.normName === nt);
          if (exact.length === 1) { clientId = exact[0].id; via = "NAME_EXACT"; break outer; }
          if (exact.length > 1) break outer;
          if (nt.length >= 4) {
            const tw = nt.split(" ").filter(Boolean);
            const ts = tw[tw.length - 1] || "";
            const scored = idx.map((c) => {
              const d = levenshtein(nt, c.normName);
              const ratio = d / Math.max(nt.length, c.normName.length);
              const cw = c.normName.split(" ").filter(Boolean);
              const cs = cw[cw.length - 1] || "";
              const sd = levenshtein(ts, cs);
              const sr = ts && cs ? sd / Math.max(ts.length, cs.length) : 1;
              return { ...c, ratio, sr };
            }).filter((c) => c.ratio <= FUZZY_MAX_RATIO && c.sr <= 0.3)
              .sort((a, b) => a.ratio - b.ratio);
            if (scored.length === 1) { clientId = scored[0].id; via = "NAME_FUZZY"; break outer; }
            if (scored.length > 1) break outer;
          }
        }
      }

      if (clientId && via) {
        let userId = fallbackUserId;
        for (const mid of card.idMembers) {
          const uid = byEmail.get(MEMBER_EMAIL_MAP[mid] || "");
          if (uid) { userId = uid; break; }
        }
        await prisma.interaction.create({
          data: {
            userId, clientId,
            channel: "TRELLO_TASK",
            direction: "OUTBOUND",
            summary: card.desc?.trim() || `Trello task completed: ${card.name}`,
            occurredAt: cardDate,
            meetingWith: `trello:${card.id}`,
          },
        });
        linked++;
      } else {
        await prisma.smartAlert.create({
          data: {
            ownerId: fallbackUserId,
            alertType: "TRELLO_UNMATCHED",
            title: "Trello card needs manual review",
            body: `"${card.name}" is in Done but couldn't be matched to a client automatically.`,
            metadata: { trelloCardId: card.id, trelloCardName: card.name, trelloCardDesc: card.desc },
          },
        });
        review++;
      }
    }

    const durationMs = Date.now() - startedAt.getTime();
    console.log(`Trello daily sync complete: linked=${linked} review=${review} skipped=${skipped} duration=${durationMs}ms`);

    return NextResponse.json({
      ok: true, linked, review, skipped,
      totalCards: doneCards.length,
      durationMs,
    });
  } catch (err) {
    console.error("Trello daily sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
