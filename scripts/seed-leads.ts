import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_ID = "cmpwac91s0000oqwn4dj8pxxq";

const firstNames = [
  "Rahul", "Priya", "Amit", "Sunita", "Vikram", "Neha", "Rajesh", "Pooja",
  "Suresh", "Kavita", "Arun", "Meena", "Deepak", "Anita", "Sanjay", "Ritu",
  "Mahesh", "Geeta", "Rakesh", "Seema", "Arjun", "Divya", "Vinod", "Usha",
  "Manoj", "Rekha", "Ajay", "Suman", "Nitin", "Asha", "Rohit", "Nisha",
  "Kiran", "Preeti", "Vijay", "Shweta", "Sandeep", "Anjali", "Ravi", "Poonam",
  "Naveen", "Meenakshi", "Ashok", "Vandana", "Sunil", "Savita", "Anil", "Sudha",
  "Harish", "Lata", "Ramesh", "Beena", "Girish", "Smita", "Dinesh", "Hema",
  "Prakash", "Madhuri", "Venkat", "Lakshmi", "Balaji", "Padma", "Rajan", "Geetha",
  "Krishnan", "Saraswathi", "Subramaniam", "Vasantha", "Senthil", "Malathi",
  "Gurpreet", "Harpreet", "Jaspreet", "Manpreet", "Navneet", "Parminder",
  "Daljit", "Kulwinder", "Satinder", "Balwinder", "Amritpal", "Ravinder",
  "Chirag", "Dhruv", "Harsh", "Ishaan", "Jay", "Kushal", "Mihir", "Nikhil",
  "Parth", "Raj", "Sahil", "Tanmay", "Uday", "Vatsal", "Yash", "Zaid",
  "Aisha", "Fatima", "Zainab", "Noor", "Sara", "Ruhi", "Sana", "Aliya",
  "Bhavna", "Champa", "Daksha", "Falak", "Gayatri", "Heena", "Indira", "Jasmine",
];

const lastNames = [
  "Sharma", "Verma", "Singh", "Kumar", "Gupta", "Patel", "Shah", "Mehta",
  "Joshi", "Nair", "Pillai", "Menon", "Iyer", "Iyengar", "Reddy", "Rao",
  "Naidu", "Chettiar", "Murugan", "Krishnamurthy", "Subramaniam", "Venkataraman",
  "Sidhu", "Gill", "Dhillon", "Grewal", "Sandhu", "Bhatia", "Kapoor", "Khanna",
  "Malhotra", "Chopra", "Anand", "Arora", "Bajaj", "Chadha", "Dua", "Garg",
  "Aggarwal", "Bansal", "Mittal", "Agarwal", "Jain", "Khandelwal", "Mundra",
  "Desai", "Modi", "Trivedi", "Bhatt", "Pandya", "Raval", "Thakkar", "Dalal",
  "Bose", "Chatterjee", "Mukherjee", "Banerjee", "Das", "Sen", "Ghosh", "Roy",
  "Mishra", "Tiwari", "Pandey", "Shukla", "Dubey", "Tripathi", "Srivastava",
  "Mathur", "Saxena", "Awasthi", "Dixit", "Rastogi", "Bajpai", "Chaturvedi",
];

const cities = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Surat", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Kochi", state: "Kerala" },
  { city: "Chandigarh", state: "Punjab" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Vizag", state: "Andhra Pradesh" },
];

const interests = [
  "NRI Wealth & Investment Planning",
  "Mutual Funds",
  "Portfolio Management",
  "Tax Planning",
  "Insurance",
  "Retirement Planning",
  "Real Estate Investment",
  "Fixed Income",
  "NRI Tax & FEMA Compliance",
  "Estate Planning",
];

const sources = ["WEBSITE", "REFERRAL", "ADVERTISEMENT", "SOCIAL_MEDIA", "COLD_CALL"];

const notes = [
  "Interested in long-term investment options. Has existing SIPs.",
  "Looking to consolidate portfolio. Currently with 3 different advisors.",
  "NRI based in Dubai. Wants to invest in India.",
  "Referred by Sanjeev Mangotra. High intent.",
  "Has inherited property and wants investment advice.",
  "Recently retired. Looking for fixed income options.",
  "Young professional. First time investor.",
  "Business owner looking for tax planning.",
  "Wants to plan for children's education.",
  "Planning retirement in 5 years. Needs corpus planning.",
  "Interested in NPS and tax saving instruments.",
  "High net worth individual. Looking for PMS.",
  "Wants to shift from FDs to better yielding instruments.",
  "Concerned about market volatility. Conservative investor.",
  "Aggressive investor. Wants equity heavy portfolio.",
  "NRI in US. FEMA compliance queries.",
  "Looking for insurance cum investment products.",
  "Family office setup needed.",
  "First time MF investor. Needs guidance.",
  "Has home loan. Wants prepayment vs investment advice.",
];

const stages = [
  { stage: "NEW", count: 80 },
  { stage: "CONTACTED", count: 60 },
  { stage: "MEETING_SCHEDULED", count: 50 },
  { stage: "INTERESTED", count: 40 },
  { stage: "DOCUMENTATION_PENDING", count: 30 },
  { stage: "PAYMENT_PENDING", count: 20 },
  { stage: "CONVERTED", count: 20 },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const prefixes = ["98", "97", "96", "95", "94", "93", "92", "91", "90", "89", "88", "87", "86", "85", "84", "83", "82", "81", "80", "79", "78", "77", "76", "75", "74", "73", "72", "70"];
  const prefix = rand(prefixes);
  const rest = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
  return `+91${prefix}${rest}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "yahoo.co.in"];
  const patterns = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randInt(1, 99)}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(1, 99)}`,
  ];
  return `${rand(patterns)}@${rand(domains)}`;
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

async function main() {
  console.log("🌱 Seeding leads...");

  // Build flat list of stages
  const stageList: string[] = [];
  for (const { stage, count } of stages) {
    for (let i = 0; i < count; i++) stageList.push(stage);
  }
  // Shuffle
  for (let i = stageList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stageList[i], stageList[j]] = [stageList[j], stageList[i]];
  }

  const leads = [];
  for (let i = 0; i < stageList.length; i++) {
    const firstName = rand(firstNames);
    const lastName = rand(lastNames);
    const location = rand(cities);
    const residencyType = Math.random() < 0.3 ? "NRI" : "RESIDENT";
    const stage = stageList[i];
    const createdAt = randomDate(180); // last 6 months

    leads.push({
      ownerId: OWNER_ID,
      fullName: `${firstName} ${lastName}`,
      email: generateEmail(firstName, lastName),
      phone: generatePhone(),
      residencyType: residencyType as any,
      interest: rand(interests),
      source: rand(sources) as any,
      stage: stage as any,
      notes: `${rand(notes)} [${location.city}]`,
      createdAt,
      updatedAt: createdAt,
      lastActivityAt: createdAt,
      deletedAt: null,
    });
  }

  // Insert in batches of 50
  let created = 0;
  const BATCH = 50;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    await prisma.lead.createMany({ data: batch, skipDuplicates: true });
    created += batch.length;
    console.log(`  ✅ ${created}/${leads.length} leads created`);
  }

  console.log(`\n🎉 Done! ${created} leads seeded successfully.`);
  
  // Summary
  const counts = await prisma.lead.groupBy({
    by: ["stage"],
    where: { ownerId: OWNER_ID },
    _count: true,
  });
  console.log("\nPipeline breakdown:");
  counts.forEach(c => console.log(`  ${c.stage}: ${c._count}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
