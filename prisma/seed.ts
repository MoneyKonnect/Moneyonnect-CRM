import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RelationIQ database...");

  // ─── Demo User ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@relationiq.com" },
    update: {},
    create: {
      email: "demo@relationiq.com",
      name: "Arjun Mehta",
      password: hashedPassword,
      role: "ADVISOR",
    },
  });
  console.log("✅ Demo user:", user.email);

  // ─── Suggestion Templates ──────────────────────────────────────────────
  console.log("🧠 Seeding suggestion templates...");

  const templates = [
    // ── INFANT ────────────────────────────────────────────────────────────
    {
      productName: "Sukanya Samriddhi Yojana",
      description: "Government-backed savings scheme for girl child. Tax-free returns, 8.2% interest. Best started immediately after birth for maximum corpus.",
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
      productName: "Child ULIP / Child Plan",
      description: "Unit-linked insurance plan for child's future. Provides life cover for parent + wealth creation for child's education and marriage.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["INFANT"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI"],
      minAge: 0,
      maxAge: 5,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Term Insurance for Parents",
      description: "With a new child, parents' term cover should be reviewed. Income replacement should cover at minimum 20 years of expenses + child's education corpus.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["INFANT"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 0,
      maxAge: 3,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "PPF Account (Child)",
      description: "Open PPF account in child's name. 15-year lock-in perfectly aligns with education funding. Tax-free under Section 80C.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["INFANT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 0,
      maxAge: 5,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── STUDENT ───────────────────────────────────────────────────────────
    {
      productName: "Education Loan Planning",
      description: "Plan for education loan requirements 2-3 years in advance. Evaluate loan vs investment corpus. Interest deductible under Section 80E.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["STUDENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 16,
      maxAge: 22,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "First SIP — ₹500 Starter",
      description: "Start investment habit early. Even ₹500/month in index fund creates powerful compounding habit and ₹2.5L+ corpus by graduation at 12% returns.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["STUDENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 18,
      maxAge: 24,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Health Insurance (Floater Extension)",
      description: "Ensure student is covered under family floater until age 25 or first job. Check floater limits are adequate.",
      category: "INSURANCE",
      priority: 2,
      lifeStages: ["STUDENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 18,
      maxAge: 25,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── EARLY CAREER ──────────────────────────────────────────────────────
    {
      productName: "Term Insurance — URGENT",
      description: "First job = first income = first liability. Minimum 15-20x annual income term cover. Lock-in low premium at young age. Non-negotiable priority.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["EARLY_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI"],
      minAge: 22,
      maxAge: 30,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Emergency Fund — 6 Months",
      description: "Build liquid emergency fund of 6 months expenses before any other investment. Ideal: FD + liquid mutual fund split.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["EARLY_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 22,
      maxAge: 30,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "ELSS Tax Saving Fund",
      description: "Best tax-saving instrument — only 3-year lock-in vs PPF's 15 years. Section 80C benefit + equity returns. Start with ₹12,500/month = ₹1.5L annual deduction.",
      category: "TAX",
      priority: 1,
      lifeStages: ["EARLY_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 22,
      maxAge: 32,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "NPS Tier 1 — Start Early",
      description: "Additional ₹50,000 deduction under 80CCD(1B) over 80C limit. Equity exposure up to 75% in young years. Huge corpus at retirement with early start.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["EARLY_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 22,
      maxAge: 32,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── MID CAREER ────────────────────────────────────────────────────────
    {
      productName: "SIP Step-Up Strategy",
      description: "Increase SIP by 10-15% every year aligned with salary hike. ₹10,000/month at 10% step-up = ₹2.3Cr in 20 years vs ₹76L flat. Massive difference.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI"],
      minAge: 30,
      maxAge: 45,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Critical Illness Cover",
      description: "High-stress career phase. Critical illness lump sum cover of ₹25-50L protects income if serious illness strikes. Separate from health insurance.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 35,
      maxAge: 50,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Portfolio Rebalancing Review",
      description: "Annual equity-debt rebalancing ensures risk stays aligned with goals. Review asset allocation — typically 70:30 equity:debt in mid-career.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 35,
      maxAge: 50,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "PMS / AIF Consideration",
      description: "For clients with AUM > ₹50L, Portfolio Management Services offer customized equity portfolios. AIF for ₹1Cr+ with unique risk-return profiles.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["MID_CAREER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI"],
      minAge: 35,
      maxAge: 55,
      minAum: 5000000,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── FAMILY BUILDER ────────────────────────────────────────────────────
    {
      productName: "Home Loan Optimization",
      description: "Review prepayment vs investment strategy. Usually investment beats prepayment if loan rate < 8.5%. Balance tax benefit (80C + 24b) vs prepayment gains.",
      category: "TAX",
      priority: 1,
      lifeStages: ["FAMILY_BUILDER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 30,
      maxAge: 50,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Children Education Fund",
      description: "Education costs doubling every 7 years. ₹20L engineering today = ₹80L in 14 years. Start dedicated SIP with target corpus calculation now.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["FAMILY_BUILDER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI"],
      minAge: 28,
      maxAge: 45,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Family Health Floater Upgrade",
      description: "Super top-up plan is most cost-effective. Base floater ₹5L + super top-up ₹20L better than single ₹25L plan. Review annually as family grows.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["FAMILY_BUILDER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 28,
      maxAge: 50,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Will & Estate Planning",
      description: "With assets, spouse, and children — a will is non-negotiable. Review nominees on all investments, insurance. Consider family trust for HNI clients.",
      category: "ESTATE",
      priority: 1,
      lifeStages: ["FAMILY_BUILDER"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 35,
      maxAge: 55,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── NEAR RETIREMENT ───────────────────────────────────────────────────
    {
      productName: "Equity → Debt Transition (Glide Path)",
      description: "Reduce equity exposure by 5-10% per year from age 50. Target 40:60 equity:debt at retirement. Protect corpus from sequence-of-returns risk.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN", "RETURNING_NRI"],
      minAge: 50,
      maxAge: 62,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "NPS Maximize (80CCD)",
      description: "Last 10 years before retirement — maximize NPS contributions. ₹50,000 additional 80CCD(1B) deduction. Annuity portion provides pension income.",
      category: "TAX",
      priority: 1,
      lifeStages: ["NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 50,
      maxAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Senior Citizen Health Insurance",
      description: "Get dedicated senior citizen health plan before existing plan lapses or premium spikes. Pre-existing disease waiting period must be considered.",
      category: "INSURANCE",
      priority: 1,
      lifeStages: ["NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 55,
      maxAge: 65,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Retirement Corpus Calculation",
      description: "Formal retirement corpus review: target corpus = 25x annual expenses (4% SWR rule). Account for inflation at 6-7%. Check if on track.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 50,
      maxAge: 62,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── RETIRED ───────────────────────────────────────────────────────────
    {
      productName: "Senior Citizen Savings Scheme (SCSS)",
      description: "Best risk-free return for seniors — currently 8.2% p.a. Max ₹30L investment. Quarterly interest payout. 5-year tenure extendable by 3 years. Section 80C benefit.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["RETIRED"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Systematic Withdrawal Plan (SWP)",
      description: "More tax-efficient than FD interest. Only gains taxed, not principal. Set up SWP from balanced advantage fund for regular monthly income.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["RETIRED"],
      residencyTypes: ["RESIDENT_INDIAN"],
      minAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Dedicated Medical Emergency Corpus",
      description: "Keep ₹15-25L separate in liquid instruments only for medical emergencies. Do not mix with regular investment corpus. Liquid FD + liquid fund.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["RETIRED"],
      residencyTypes: ["RESIDENT_INDIAN", "RETURNING_NRI"],
      minAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },
    {
      productName: "Estate Planning & Will Finalization",
      description: "Final review of Will, nominees, power of attorney. Consider creating a trust for smooth asset transfer. Review joint account arrangements.",
      category: "ESTATE",
      priority: 1,
      lifeStages: ["RETIRED"],
      residencyTypes: ["RESIDENT_INDIAN", "NRI", "OCI", "RETURNING_NRI"],
      minAge: 60,
      isNriSpecific: false,
      isHufSpecific: false,
    },

    // ── NRI SPECIFIC ──────────────────────────────────────────────────────
    {
      productName: "NRE/NRO Account Optimization",
      description: "NRE: repatriable, tax-free interest in India. NRO: non-repatriable, taxable. Optimal split depends on repatriation needs and India tax liability.",
      category: "COMPLIANCE",
      priority: 1,
      lifeStages: ["EARLY_CAREER", "MID_CAREER", "FAMILY_BUILDER"],
      residencyTypes: ["NRI"],
      countryRules: ["AE", "QA", "KW", "BH", "OM", "SA"],
      isNriSpecific: true,
      isHufSpecific: false,
    },
    {
      productName: "FATCA / DTAA Planning (US NRI)",
      description: "US persons must report Indian accounts on FBAR/FATCA. DTAA benefit available to avoid double taxation. Annual Form 3520 for PF/PPF. Get US-India tax specialist.",
      category: "COMPLIANCE",
      priority: 1,
      lifeStages: ["EARLY_CAREER", "MID_CAREER", "FAMILY_BUILDER", "NEAR_RETIREMENT"],
      residencyTypes: ["NRI", "OCI"],
      countryRules: ["US"],
      isNriSpecific: true,
      isHufSpecific: false,
    },
    {
      productName: "Returning NRI — Residency Transition",
      description: "RNOR status gives 2-3 year tax exemption on foreign income after return. Plan investment realizations strategically before becoming Resident. Update KYC, repatriate NRE funds.",
      category: "COMPLIANCE",
      priority: 1,
      lifeStages: ["MID_CAREER", "FAMILY_BUILDER", "NEAR_RETIREMENT"],
      residencyTypes: ["RETURNING_NRI"],
      isNriSpecific: true,
      isHufSpecific: false,
    },
    {
      productName: "NRI Remittance & Inheritance Planning",
      description: "No inheritance tax in India currently but plan for FEMA compliance on inheritance. Repatriation of inherited assets through NRO account with CA certificate.",
      category: "ESTATE",
      priority: 2,
      lifeStages: ["MID_CAREER", "FAMILY_BUILDER", "NEAR_RETIREMENT", "RETIRED"],
      residencyTypes: ["NRI", "OCI", "PIO"],
      isNriSpecific: true,
      isHufSpecific: false,
    },
    {
      productName: "UK NRI — ISA vs India Investment",
      description: "UK residents can use ISA wrapper (£20K annual). Balance between ISA investments and Indian mutual funds. Consider UK pension (SIPP) contributions.",
      category: "INVESTMENT",
      priority: 2,
      lifeStages: ["EARLY_CAREER", "MID_CAREER", "FAMILY_BUILDER"],
      residencyTypes: ["NRI", "OCI"],
      countryRules: ["GB"],
      isNriSpecific: true,
      isHufSpecific: false,
    },

    // ── HUF SPECIFIC ──────────────────────────────────────────────────────
    {
      productName: "HUF Tax Planning",
      description: "HUF is a separate tax entity with its own ₹2.5L basic exemption + 80C benefit of ₹1.5L. Effectively creates additional ₹4L tax-free income. Structure carefully to maximize benefit.",
      category: "TAX",
      priority: 1,
      lifeStages: ["MID_CAREER", "FAMILY_BUILDER", "NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      isNriSpecific: false,
      isHufSpecific: true,
    },
    {
      productName: "HUF Investment Account",
      description: "Open dedicated demat + mutual fund folios in HUF name. Route appropriate investments through HUF to utilize separate tax slabs and 80C benefits.",
      category: "INVESTMENT",
      priority: 1,
      lifeStages: ["MID_CAREER", "FAMILY_BUILDER"],
      residencyTypes: ["RESIDENT_INDIAN"],
      isNriSpecific: false,
      isHufSpecific: true,
    },
    {
      productName: "HUF Succession Planning",
      description: "HUF continues after Karta's death but requires succession planning. Define coparceners, consider partial partition for married daughters, update nominees on HUF accounts.",
      category: "ESTATE",
      priority: 1,
      lifeStages: ["NEAR_RETIREMENT", "RETIRED"],
      residencyTypes: ["RESIDENT_INDIAN"],
      isNriSpecific: false,
      isHufSpecific: true,
    },
    {
      productName: "HUF Family Allocation Tracking",
      description: "Track which family assets are in HUF vs individual names. Annual review of HUF vs individual allocation ensures optimal tax efficiency as family situation changes.",
      category: "TAX",
      priority: 2,
      lifeStages: ["MID_CAREER", "FAMILY_BUILDER", "NEAR_RETIREMENT"],
      residencyTypes: ["RESIDENT_INDIAN"],
      isNriSpecific: false,
      isHufSpecific: true,
    },
  ];

  for (const t of templates) {
    await prisma.suggestionTemplate.upsert({
      where: { id: `template-${t.productName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().substring(0, 50)}` },
      update: {
        description: t.description,
        priority: t.priority,
        isActive: true,
      },
      create: {
        id: `template-${t.productName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().substring(0, 50)}`,
        productName: t.productName,
        description: t.description,
        category: t.category,
        priority: t.priority,
        lifeStages: t.lifeStages as any,
        residencyTypes: t.residencyTypes as any,
        countryRules: (t as any).countryRules || [],
        minAge: (t as any).minAge || null,
        maxAge: (t as any).maxAge || null,
        minAum: (t as any).minAum || null,
        isNriSpecific: t.isNriSpecific,
        isHufSpecific: t.isHufSpecific,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${templates.length} suggestion templates`);

  // ─── Tags ──────────────────────────────────────────────────────────────
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: "VIP" }, update: {}, create: { name: "VIP", color: "#f59e0b" } }),
    prisma.tag.upsert({ where: { name: "NRI" }, update: {}, create: { name: "NRI", color: "#6366f1" } }),
    prisma.tag.upsert({ where: { name: "SIP Active" }, update: {}, create: { name: "SIP Active", color: "#10b981" } }),
    prisma.tag.upsert({ where: { name: "Review Due" }, update: {}, create: { name: "Review Due", color: "#f43f5e" } }),
    prisma.tag.upsert({ where: { name: "HUF" }, update: {}, create: { name: "HUF", color: "#8b5cf6" } }),
  ]);
  console.log("✅ Tags created");

  // ─── Clients ───────────────────────────────────────────────────────────
  const rajesh = await prisma.client.upsert({
    where: { id: "seed-rajesh-kumar-sharma" },
    update: {},
    create: {
      id: "seed-rajesh-kumar-sharma",
      ownerId: user.id,
      clientType: "INDIVIDUAL",
      fullName: "Rajesh Kumar Sharma",
      phone: "+91 98765 43210",
      email: "rajesh.sharma@gmail.com",
      dob: new Date("1978-03-15"),
      pan: "ABCRS1234K",
      occupation: "Software Architect",
      incomeBracket: "₹50L – ₹1Cr",
      riskAppetite: "AGGRESSIVE",
      city: "Mumbai",
      state: "Maharashtra",
      category: "HNI",
      status: "ACTIVE",
      aum: 4500000,
      residency: { create: { residencyType: "RESIDENT_INDIAN" } },
    },
  });

  const priya = await prisma.client.upsert({
    where: { id: "seed-priya-anand" },
    update: {},
    create: {
      id: "seed-priya-anand",
      ownerId: user.id,
      clientType: "INDIVIDUAL",
      fullName: "Priya Anand",
      phone: "+1 415 555 0123",
      email: "priya.anand@techcorp.com",
      dob: new Date("1985-07-22"),
      pan: "BCXPA5678L",
      occupation: "Product Manager",
      incomeBracket: "> ₹1Cr",
      riskAppetite: "MODERATE",
      city: "San Francisco",
      state: "CA, USA",
      category: "ULTRA_HNI",
      status: "ACTIVE",
      aum: 12500000,
      residency: {
        create: {
          residencyType: "NRI",
          countryOfResidence: "United States",
          citizenship: "Indian",
          visaType: "H1B",
          taxResidency: "USA",
          timezone: "PST",
          accountType: "NRE",
          fatcaCompliant: true,
          foreignAddress: "123 Market St, San Francisco, CA 94105",
          indianAddress: "45, Juhu Beach Road, Mumbai 400049",
          passportNumber: "P1234567",
        },
      },
    },
  });

  const vikram = await prisma.client.upsert({
    where: { id: "seed-vikram-singh" },
    update: {},
    create: {
      id: "seed-vikram-singh",
      ownerId: user.id,
      clientType: "INDIVIDUAL",
      fullName: "Vikram Singh",
      phone: "+91 99887 76654",
      email: "vikram.singh@startup.in",
      dob: new Date("1988-11-08"),
      pan: "DFGVS8901M",
      occupation: "Startup Founder",
      incomeBracket: "₹25L – ₹50L",
      riskAppetite: "VERY_AGGRESSIVE",
      city: "Bangalore",
      state: "Karnataka",
      category: "PREMIUM",
      status: "ACTIVE",
      aum: 2800000,
      residency: { create: { residencyType: "RESIDENT_INDIAN" } },
    },
  });

  // HUF Client
  const sharmaHUF = await prisma.client.upsert({
    where: { id: "seed-sharma-huf" },
    update: {},
    create: {
      id: "seed-sharma-huf",
      ownerId: user.id,
      clientType: "HUF",
      fullName: "Rajesh Kumar Sharma HUF",
      pan: "ABCRS1234H",
      hufKartaName: "Rajesh Kumar Sharma",
      hufPan: "ABCRS1234H",
      city: "Mumbai",
      state: "Maharashtra",
      category: "HNI",
      status: "ACTIVE",
      aum: 3200000,
      residency: { create: { residencyType: "RESIDENT_INDIAN" } },
    },
  });

  console.log("✅ Clients created");

  // ─── Family Groups ─────────────────────────────────────────────────────
  const sharmaFamily = await prisma.familyGroup.upsert({
    where: { id: "seed-sharma-family" },
    update: {},
    create: {
      id: "seed-sharma-family",
      name: "Sharma Family",
      groupType: "REGULAR",
      headClientId: rajesh.id,
      ownerId: user.id,
      notes: "Mumbai-based joint family. Main breadwinner Rajesh. Parents retired.",
    },
  });

  const sharmaHUFGroup = await prisma.familyGroup.upsert({
    where: { id: "seed-sharma-huf-group" },
    update: {},
    create: {
      id: "seed-sharma-huf-group",
      name: "Sharma HUF",
      groupType: "HUF",
      headClientId: rajesh.id,
      ownerId: user.id,
      kartaName: "Rajesh Kumar Sharma",
      hufPan: "ABCRS1234H",
      hufFormationDate: new Date("2010-04-01"),
      notes: "4 coparceners in HUF. Used for tax optimization.",
    },
  });

  console.log("✅ Family groups created");

  // ─── Family Members ────────────────────────────────────────────────────
  await prisma.familyMember.createMany({
    skipDuplicates: true,
    data: [
      // Sharma family - regular
      {
        id: "seed-sunita-sharma",
        familyGroupId: sharmaFamily.id,
        relationship: "SPOUSE",
        fullName: "Sunita Sharma",
        dob: new Date("1981-06-15"),
        phone: "+91 98765 43211",
        email: "sunita.sharma@gmail.com",
        occupation: "Interior Designer",
        lifeStage: "FAMILY_BUILDER",
        dependencyType: "INDEPENDENT",
        isHufCoparcener: true,
        communicationConsent: true,
        notes: "Co-owns property. Active in children education planning.",
      },
      {
        id: "seed-aryan-sharma",
        familyGroupId: sharmaFamily.id,
        relationship: "CHILD",
        fullName: "Aryan Sharma",
        dob: new Date("2008-03-22"),
        occupation: null,
        education: "Grade 9, DPS Mumbai",
        lifeStage: "STUDENT",
        dependencyType: "DEPENDENT",
        isHufCoparcener: true,
        communicationConsent: false,
        notes: "Interested in engineering. Education fund needed by 2026.",
      },
      {
        id: "seed-ananya-sharma",
        familyGroupId: sharmaFamily.id,
        relationship: "CHILD",
        fullName: "Ananya Sharma",
        dob: new Date("2015-09-10"),
        occupation: null,
        education: "Grade 4, DPS Mumbai",
        lifeStage: "STUDENT",
        dependencyType: "DEPENDENT",
        isHufCoparcener: false,
        communicationConsent: false,
        notes: "Sukanya Samriddhi account active. Girl child SSY benefits.",
      },
      {
        id: "seed-ramesh-sharma",
        familyGroupId: sharmaFamily.id,
        relationship: "PARENT",
        fullName: "Ramesh Sharma",
        dob: new Date("1952-07-01"),
        phone: "+91 97654 11111",
        occupation: "Retired (Govt Service)",
        lifeStage: "RETIRED",
        dependencyType: "DEPENDENT",
        isHufCoparcener: true,
        communicationConsent: true,
        notes: "Gets pension. Has SCSS account. Health insurance under family floater.",
      },
      {
        id: "seed-kamla-sharma",
        familyGroupId: sharmaFamily.id,
        relationship: "PARENT",
        fullName: "Kamla Sharma",
        dob: new Date("1955-12-20"),
        lifeStage: "RETIRED",
        dependencyType: "DEPENDENT",
        isHufCoparcener: false,
        communicationConsent: false,
        notes: "Homemaker. Covered under husband's pension health scheme.",
      },
    ],
  });

  console.log("✅ Family members created");

  // ─── Investments ───────────────────────────────────────────────────────
  await prisma.investment.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-inv-1", clientId: rajesh.id, schemeName: "Parag Parikh Flexi Cap Fund", type: "MUTUAL_FUND", amount: 1500000, currentValue: 1892000, startDate: new Date("2022-01-15") },
      { id: "seed-inv-2", clientId: rajesh.id, schemeName: "ICICI Bank FD", type: "FD", amount: 1000000, currentValue: 1070000, startDate: new Date("2023-04-01"), maturityDate: new Date("2024-04-01") },
      { id: "seed-inv-3", clientId: priya.id, schemeName: "Mirae Asset Large Cap Fund", type: "MUTUAL_FUND", amount: 5000000, currentValue: 6300000, startDate: new Date("2021-06-01") },
      { id: "seed-inv-4", clientId: vikram.id, schemeName: "Zerodha Direct Equity", type: "STOCKS", amount: 1200000, currentValue: 1580000, startDate: new Date("2022-08-10") },
      { id: "seed-inv-5", clientId: sharmaHUF.id, schemeName: "Sharma HUF - ELSS Fund", type: "ELSS", amount: 1500000, currentValue: 1850000, startDate: new Date("2020-04-01") },
    ],
  });

  // ─── Financial Goals ───────────────────────────────────────────────────
  await prisma.financialGoal.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-goal-1", clientId: rajesh.id, title: "Aryan's Engineering Education", goalType: "EDUCATION", targetAmount: 3500000, currentAmount: 800000, targetDate: new Date("2026-06-01"), status: "ACTIVE", notes: "IIT preferred. Private college backup." },
      { id: "seed-goal-2", clientId: rajesh.id, title: "Retirement Corpus", goalType: "RETIREMENT", targetAmount: 50000000, currentAmount: 8500000, targetDate: new Date("2038-03-01"), status: "ACTIVE" },
      { id: "seed-goal-3", clientId: priya.id, title: "Return to India Fund", goalType: "OTHER", targetAmount: 10000000, currentAmount: 4500000, targetDate: new Date("2027-01-01"), status: "ACTIVE", notes: "Planning to return Q3 2027." },
    ],
  });

  // ─── Onboarding checklists ─────────────────────────────────────────────
  const onboardingSteps = [
    { stepKey: "pan_collected", stepName: "PAN Card collected", sortOrder: 1 },
    { stepKey: "aadhaar_collected", stepName: "Aadhaar collected", sortOrder: 2 },
    { stepKey: "bank_details", stepName: "Bank details verified", sortOrder: 3 },
    { stepKey: "risk_profile", stepName: "Risk profile assessment done", sortOrder: 4 },
    { stepKey: "kyc_complete", stepName: "KYC completed", sortOrder: 5 },
    { stepKey: "first_investment", stepName: "First investment placed", sortOrder: 6 },
    { stepKey: "nominee_added", stepName: "Nominee details added", sortOrder: 7 },
    { stepKey: "will_discussed", stepName: "Will / estate planning discussed", sortOrder: 8 },
  ];

  for (const step of onboardingSteps) {
    await prisma.onboardingChecklist.upsert({
      where: { id: `seed-onboard-rajesh-${step.stepKey}` },
      update: {},
      create: {
        id: `seed-onboard-rajesh-${step.stepKey}`,
        clientId: rajesh.id,
        ...step,
        completed: ["pan_collected", "aadhaar_collected", "kyc_complete", "risk_profile"].includes(step.stepKey),
        completedAt: ["pan_collected", "aadhaar_collected", "kyc_complete", "risk_profile"].includes(step.stepKey) ? new Date("2023-01-15") : null,
      },
    });
  }

  // ─── Interactions ──────────────────────────────────────────────────────
  await prisma.interaction.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-int-1", clientId: rajesh.id, userId: user.id, channel: "PHONE", direction: "OUTBOUND", summary: "Quarterly portfolio review. Discussed equity allocation — client wants to increase SIP.", occurredAt: new Date(Date.now() - 5 * 86400000) },
      { id: "seed-int-2", clientId: rajesh.id, userId: user.id, familyMemberId: "seed-sunita-sharma", meetingWith: "Rajesh + Sunita Sharma", channel: "IN_PERSON", direction: "OUTBOUND", summary: "Annual family financial review. Discussed Aryan's education fund and Ananya's SSY.", occurredAt: new Date(Date.now() - 15 * 86400000) },
      { id: "seed-int-3", clientId: priya.id, userId: user.id, channel: "VIDEO_CALL", direction: "OUTBOUND", summary: "FATCA compliance discussion. Recommended US-India tax specialist. NRE account optimization reviewed.", occurredAt: new Date(Date.now() - 7 * 86400000) },
      { id: "seed-int-4", clientId: vikram.id, userId: user.id, channel: "WHATSAPP", direction: "INBOUND", summary: "Query about startup ESOP taxation. Shared relevant sections. Follow-up call scheduled.", occurredAt: new Date(Date.now() - 3 * 86400000) },
    ],
  });

  // ─── Notes ─────────────────────────────────────────────────────────────
  await prisma.note.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-note-1", clientId: rajesh.id, authorId: user.id, content: "Rajesh planning to buy 2nd property in Pune next year. May need to liquidate some equity. Keep watch on real estate market.", isPinned: true },
      { id: "seed-note-2", clientId: rajesh.id, authorId: user.id, content: "Mentioned brother Suresh also interested in financial planning. Potential referral — follow up after Diwali.", isPinned: false },
      { id: "seed-note-3", clientId: priya.id, authorId: user.id, content: "Priya returning to India in Q3 2027. Must restructure NRE accounts, handle FEMA implications, and RNOR status planning. Schedule call with legal team 6 months before.", isPinned: true },
    ],
  });

  // ─── Tasks ─────────────────────────────────────────────────────────────
  const tomorrow = new Date(Date.now() + 86400000);
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const yesterday = new Date(Date.now() - 86400000);

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      { id: "seed-task-1", assigneeId: user.id, clientId: rajesh.id, title: "Portfolio review call", type: "CALL", priority: "HIGH", status: "PENDING", dueAt: tomorrow, description: "Quarterly review — focus on equity allocation and Aryan education SIP step-up" },
      { id: "seed-task-2", assigneeId: user.id, clientId: priya.id, title: "NRI account restructuring", type: "MEETING", priority: "URGENT", status: "PENDING", dueAt: yesterday, description: "FEMA compliance check before return to India. Coordinate with legal team." },
      { id: "seed-task-3", assigneeId: user.id, clientId: vikram.id, title: "Follow up on SIP increase", type: "FOLLOW_UP", priority: "MEDIUM", status: "PENDING", dueAt: nextWeek },
      { id: "seed-task-4", assigneeId: user.id, clientId: rajesh.id, title: "KYC renewal", type: "KYC_RENEWAL", priority: "HIGH", status: "PENDING", dueAt: new Date(Date.now() + 3 * 86400000) },
    ],
  });

  // ─── Leads ─────────────────────────────────────────────────────────────
  const leadsData = [
    { id: "seed-lead-1", fullName: "Ankita Desai", phone: "+91 99000 11222", email: "ankita.desai@company.com", source: "REFERRAL", stage: "MEETING_SCHEDULED", estimatedValue: 3000000, nextFollowUpAt: tomorrow, notes: "Referred by Rajesh. Works in pharma." },
    { id: "seed-lead-2", fullName: "Rohit Malhotra", phone: "+91 88776 65544", source: "SOCIAL_MEDIA", stage: "INTERESTED", estimatedValue: 1500000, nextFollowUpAt: nextWeek },
    { id: "seed-lead-3", fullName: "Shruti Bose", phone: "+91 97654 12345", email: "shruti.bose@startup.io", source: "REFERRAL", stage: "CONTACTED", estimatedValue: 2500000 },
    { id: "seed-lead-4", fullName: "Aditya Kapoor", source: "COLD_CALL", stage: "NEW", estimatedValue: 800000 },
    { id: "seed-lead-5", fullName: "Nisha Gupta", phone: "+91 98765 11111", email: "nisha@example.com", source: "EVENT", stage: "DOCUMENTATION_PENDING", estimatedValue: 5000000, notes: "Met at Wealth Summit. Very interested in PMS." },
    { id: "seed-lead-6", fullName: "Kiran Shah", phone: "+91 99988 77766", source: "EXISTING_CLIENT", stage: "PAYMENT_PENDING", estimatedValue: 2000000 },
    { id: "seed-lead-7", fullName: "Deepak Joshi", phone: "+91 97531 24680", source: "WEBSITE", stage: "LOST", notes: "Chose competitor. Revisit in 6 months." },
    { id: "seed-lead-8", fullName: "Pooja Mehta", phone: "+91 98765 99999", source: "REFERRAL", stage: "CONVERTED", estimatedValue: 1800000 },
  ];

  for (const lead of leadsData) {
    const { estimatedValue, nextFollowUpAt, ...rest } = lead as any;
    await prisma.lead.upsert({
      where: { id: rest.id },
      update: {},
      create: {
        ...rest,
        ownerId: user.id,
        estimatedValue: estimatedValue || null,
        nextFollowUpAt: nextFollowUpAt || null,
        lastActivityAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      },
    });
    await prisma.leadActivity.create({
      data: { leadId: rest.id, type: "CREATED", note: "Lead created" },
    }).catch(() => {});
  }

  // ─── Tag clients ───────────────────────────────────────────────────────
  await prisma.tagsOnClients.createMany({
    skipDuplicates: true,
    data: [
      { clientId: rajesh.id, tagId: tags[0].id },
      { clientId: rajesh.id, tagId: tags[2].id },
      { clientId: rajesh.id, tagId: tags[4].id },
      { clientId: priya.id, tagId: tags[0].id },
      { clientId: priya.id, tagId: tags[1].id },
      { clientId: sharmaHUF.id, tagId: tags[4].id },
    ],
  });

  console.log(`✅ Leads, tasks, notes, interactions, goals created`);
  console.log("\n🎉 Seeding complete!");
  console.log("   Login: demo@relationiq.com / password123");
}

main()
  .catch((e) => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
