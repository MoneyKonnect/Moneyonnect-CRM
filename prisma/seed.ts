import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RelationIQ database...");

  // ─── Real Super Admin ──────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("MK@Admin2024", 12);
  const user = await prisma.user.upsert({
    where: { email: "aditya.anthwal@moneykonnect.in" },
    update: { role: "SUPER_ADMIN" },
    create: {
      email: "aditya.anthwal@moneykonnect.in",
      name: "Aditya Anthwal",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ Super Admin created:", user.email);

  // ─── Suggestion Templates ──────────────────────────────────────────────
  console.log("🧠 Seeding suggestion templates...");

  const templates = [
    {
      productName: "Sukanya Samriddhi Yojana",
      description: "Government-backed savings scheme for girl child. Tax-free returns, 8.2% interest.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["INFANT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 0,
      maxAge: 10,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "NPS Tier I",
      description: "National Pension System for long-term retirement corpus. Tax benefits under 80CCD.",
      category: "RETIREMENT",
      priority: 1,
      lifeStages: ["YOUNG_ADULT", "PROFESSIONAL", "MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 18,
      maxAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "FCNR Fixed Deposit",
      description: "Foreign Currency Non-Resident deposit. Protects against currency risk, fully repatriable.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["YOUNG_ADULT", "PROFESSIONAL", "MID_CAREER", "PRE_RETIREMENT"],
      residencyTypes: ["NRI"],
      minAge: 18,
      maxAge: 80,
      isNriSpecific: true,
      isHufSpecific: false,
    },
    {
      productName: "Term Life Insurance",
      description: "Pure protection plan. High cover at low premium. Essential for earning members.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["YOUNG_ADULT", "PROFESSIONAL", "MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI"],
      minAge: 18,
      maxAge: 55,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Equity Mutual Fund - SIP",
      description: "Systematic Investment Plan in diversified equity funds. Ideal for 5+ year horizon.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["YOUNG_ADULT", "PROFESSIONAL", "MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI"],
      minAge: 18,
      maxAge: 55,
      isNriSpecific: false,
      isHufSpecific: false,
    },
  ];

  for (const t of templates) {
    await prisma.suggestionTemplate.upsert({
      where: { productName: t.productName },
      update: {},
      create: t,
    });
  }
  console.log(`✅ Created ${templates.length} suggestion templates`);

  console.log("\n🎉 Seeding complete!");
  console.log("   Login: aditya.anthwal@moneykonnect.in");
  console.log("   Password: MK@Admin2024");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
