# RelationIQ CRM

Financial advisor CRM with lead pipeline, family wealth management, smart alerts, and webinar scheduling.

## Stack
- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **PostgreSQL** + **Prisma ORM**
- **NextAuth v5** (JWT)

---

## Local Development

```bash
# 1. Install
npm install

# 2. Setup env
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Create database
createdb relationiq  # or: psql postgres -c "CREATE DATABASE relationiq;"

# 4. Push schema + seed
npx prisma db push
npm run db:seed

# 5. Start
npm run dev
```

Open http://localhost:3000 · Login: `demo@relationiq.com` / `password123`

---

## Deploy to Vercel + Railway (15 min)

### Step 1 — Database (Railway)
1. [railway.app](https://railway.app) → New Project → Add PostgreSQL
2. PostgreSQL service → **Connect** tab → copy **DATABASE_URL**

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "RelationIQ v1.0"
git remote add origin https://github.com/YOUR_USERNAME/relationiq.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. [vercel.com](https://vercel.com) → Import Git Repository
2. Framework: **Next.js** (auto-detected)
3. Add environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | From Railway |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |

4. Click **Deploy**

### Step 4 — Seed production DB
```bash
# Run once after first deploy
DATABASE_URL="your-railway-url" npx prisma db push
DATABASE_URL="your-railway-url" npm run db:seed
```

---

## Lead Capture API (for moneykonnect.in)

Public endpoint — no auth required.

**POST** `/api/public/lead-capture`

```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@email.com",
  "phone": "+919876543210",
  "residencyType": "RESIDENT",
  "interest": "NRI Wealth & Investment Planning",
  "source": "WEBSITE"
}
```

Response: `{ "success": true, "leadId": "cuid" }`

CORS: pre-configured for `https://www.moneykonnect.in`

### Website popup JS snippet:
```javascript
async function submitLead(data) {
  const res = await fetch('https://your-app.vercel.app/api/public/lead-capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

---

## Database Commands
```bash
npm run db:push      # Push schema (no migration history)
npm run db:migrate   # Create migration file
npm run db:seed      # Seed demo data
npm run db:studio    # Visual DB browser
npm run db:reset     # ⚠️ Reset + reseed (deletes all data)
```

---

## Features
- ✅ Client management (CRUD, profiles, 6 tabs)
- ✅ Family groups + HUF + life stage tracking
- ✅ 38 financial product suggestion templates
- ✅ Lead pipeline (Kanban + drag & drop)
- ✅ **Lead capture API** for website popup
- ✅ Meeting & Webinar scheduler
- ✅ Operations board (Trello-style)
- ✅ Smart alert engine (birthdays, maturity, KYC)
- ✅ AUM dashboard + referral tracking
- ✅ WhatsApp message composer (12 templates)
- ✅ XLSX export for leads
- ✅ CSV import/export
- ✅ PDF client profile export
- ✅ Audit trail
- ✅ NRI/FATCA compliance tracking
