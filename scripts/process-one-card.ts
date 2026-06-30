/**
 * process-one-card.ts — manually process ONE specific card from Trello,
 * bypassing webhook delivery entirely.
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/process-one-card.ts <cardId-or-shortLink>
 */

import { PrismaClient } from "@prisma/client";
import { distance as levenshtein } from "fastest-levenshtein";

const prisma = new PrismaClient();

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

async function main() {
  const cardIdArg = process.argv[2];
  if (!cardIdArg) {
    console.error("Usage: process-one-card.ts <cardId or shortLink>");
    process.exit(1);
  }

  console.log(`Fetching card: ${cardIdArg}`);
  const cardRes = await fetch(
    `https://api.trello.com/1/cards/${cardIdArg}?key=b85ba5057f173e2b7363a717e2c48211&token=ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE&fields=name,desc,due,dateLastActivity,idList&members=true&member_fields=id`
  );
  if (!cardRes.ok) {
    console.error(`Failed to fetch card: ${cardRes.status} ${await cardRes.text()}`);
    process.exit(1);
  }
  const card = await cardRes.json();
  const cardId: string = card.id;
  const cardName: string = card.name || "";
  const cardDesc: string = card.desc || "";
  const idMembers: string[] = (card.members || []).map((m: any) => m.id);
  const cardDate = new Date(card.due || card.dateLastActivity);

  console.log(`Card: "${cardName}"`);
  console.log(`List: ${card.idList}`);
  console.log(`Desc: ${cardDesc.slice(0, 200)}`);

  const existing = await prisma.interaction.findFirst({
    where: { meetingWith: `trello:${cardId}` },
  });
  if (existing) {
    console.log("Already processed — interaction exists:", existing.id);
    return;
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
      if (exact.length > 1) {
        console.log(`AMBIGUOUS exact match for "${candidate}": ${exact.map(c => c.fullName).join(", ")}`);
        break outer;
      }
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
        if (scored.length > 1) {
          console.log(`AMBIGUOUS fuzzy match for "${candidate}": ${scored.map(c => c.fullName).join(", ")}`);
          break outer;
        }
      }
    }
  }

  if (clientId && via) {
    const client = idx.find((c) => c.id === clientId);
    console.log(`MATCHED -> ${client?.fullName} (via ${via})`);

    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const byEmail = new Map(users.map((u) => [u.email, u.id]));
    const fallbackUserId = byEmail.get(FALLBACK_USER_EMAIL) || users[0]?.id || "";

    let userId = fallbackUserId;
    for (const mid of idMembers) {
      const uid = byEmail.get(MEMBER_EMAIL_MAP[mid] || "");
      if (uid) { userId = uid; break; }
    }

    const interaction = await prisma.interaction.create({
      data: {
        userId,
        clientId,
        channel: "TRELLO_TASK",
        direction: "OUTBOUND",
        summary: cardDesc.trim() || `Trello task completed: ${cardName}`,
        occurredAt: cardDate,
        meetingWith: `trello:${cardId}`,
      },
    });
    console.log(`CREATED interaction: ${interaction.id}`);
    console.log(`Check the Timeline at: https://moneykonnect-crm.vercel.app/clients/${clientId}`);
  } else {
    console.log("NO MATCH FOUND — would need manual review.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
