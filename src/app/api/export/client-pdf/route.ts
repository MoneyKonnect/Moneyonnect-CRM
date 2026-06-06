import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id ?? "";
    const clientId = req.nextUrl.searchParams.get("clientId");
    if (!clientId) return new NextResponse("Missing clientId", { status: 400 });

    const client = await db.client.findFirst({
      where: { id: clientId, ownerId: userId, deletedAt: null },
      include: {
        residency: true,
        investments: { orderBy: { startDate: "desc" } },
        goals: { where: { status: "ACTIVE" } },
        tags: { include: { tag: true } },
        _count: { select: { interactions: true, documents: true, tasks: true } },
      },
    });
    if (!client) return new NextResponse("Not found", { status: 404 });

    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });

    const fmt = (n: number) => {
      if (n >= 10000000) return `Rs.${(n / 10000000).toFixed(2)} Cr`;
      if (n >= 100000) return `Rs.${(n / 100000).toFixed(2)} L`;
      return `Rs.${n.toLocaleString("en-IN")}`;
    };

    const totalInv = client.investments.reduce((s, i) => s + Number(i.amount), 0);
    const totalCur = client.investments.reduce((s, i) => s + Number(i.currentValue || i.amount), 0);
    const ret = totalInv > 0 ? ((totalCur - totalInv) / totalInv * 100).toFixed(1) : "0";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:white}
.page{padding:30px;max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6366f1;padding-bottom:14px;margin-bottom:18px}
.logo{font-size:18px;font-weight:800;color:#6366f1}.logo span{color:#111}
h2{font-size:20px;font-weight:700;margin-bottom:6px}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;margin:2px;background:#e0e7ff;color:#4338ca}
.section{margin-bottom:18px}
.stitle{font-size:10px;font-weight:700;color:#6366f1;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fl{font-size:9px;color:#6b7280;text-transform:uppercase}
.fv{font-size:11px;font-weight:600;margin-top:1px}
.sc{background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center}
.sv{font-size:16px;font-weight:800;color:#6366f1}
.sl{font-size:9px;color:#6b7280;margin-top:2px}
.aum{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:8px;padding:12px;margin-bottom:14px}
.av{font-size:26px;font-weight:800}
.al{font-size:9px;opacity:0.85}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#f1f5f9;padding:5px 7px;text-align:left;font-weight:600;color:#374151}
td{padding:5px 7px;border-bottom:1px solid #f1f5f9}
.pos{color:#16a34a;font-weight:600}.neg{color:#dc2626;font-weight:600}
.footer{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:10px;color:#9ca3af;font-size:9px;display:flex;justify-content:space-between}
</style></head><body><div class="page">
<div class="header">
  <div><div class="logo">Relation<span>IQ</span></div><div style="font-size:9px;color:#6b7280;margin-top:2px">Client Profile Summary</div></div>
  <div style="text-align:right"><div style="font-size:9px;color:#6b7280">Generated on</div><div style="font-weight:600">${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div><div style="font-size:9px;color:#6b7280;margin-top:2px">Advisor: ${user?.name||"Advisor"}</div></div>
</div>
<h2>${client.fullName}</h2>
<div style="margin-bottom:14px">
  <span class="badge">${client.status}</span>
  <span class="badge" style="background:#fef3c7;color:#d97706">${client.category.replace(/_/g," ")}</span>
  ${client.residency?.residencyType!=="RESIDENT_INDIAN"?`<span class="badge" style="background:#dbeafe;color:#1d4ed8">${client.residency?.residencyType?.replace(/_/g," ")}</span>`:""}
  ${client.tags.map((t:any)=>`<span class="badge" style="background:${t.tag.color}22;color:${t.tag.color}">${t.tag.name}</span>`).join("")}
</div>
${client.aum?`<div class="aum"><div class="al">TOTAL AUM</div><div class="av">${fmt(Number(client.aum))}</div></div>`:""}
<div class="section">
  <div class="stitle">Contact & Personal</div>
  <div class="grid3">
    ${client.phone?`<div><div class="fl">Phone</div><div class="fv">${client.phone}</div></div>`:""}
    ${client.email?`<div><div class="fl">Email</div><div class="fv">${client.email}</div></div>`:""}
    ${client.city?`<div><div class="fl">Location</div><div class="fv">${client.city}${client.state?", "+client.state:""}</div></div>`:""}
    ${client.pan?`<div><div class="fl">PAN</div><div class="fv">${client.pan}</div></div>`:""}
    ${client.occupation?`<div><div class="fl">Occupation</div><div class="fv">${client.occupation}</div></div>`:""}
    ${client.riskAppetite?`<div><div class="fl">Risk Profile</div><div class="fv">${client.riskAppetite.replace(/_/g," ")}</div></div>`:""}
  </div>
</div>
<div class="section">
  <div class="stitle">Engagement</div>
  <div class="grid3">
    <div class="sc"><div class="sv">${client._count.interactions}</div><div class="sl">Interactions</div></div>
    <div class="sc"><div class="sv">${client.investments?.length||0}</div><div class="sl">Investments</div></div>
    <div class="sc"><div class="sv">${client.goals?.length||0}</div><div class="sl">Goals</div></div>
  </div>
</div>
${client.investments?.length>0?`
<div class="section">
  <div class="stitle">Investment Portfolio</div>
  <div class="grid3" style="margin-bottom:8px">
    <div class="sc"><div class="sv" style="font-size:13px">${fmt(totalInv)}</div><div class="sl">Invested</div></div>
    <div class="sc"><div class="sv" style="font-size:13px;color:${totalCur>=totalInv?"#16a34a":"#dc2626"}">${fmt(totalCur)}</div><div class="sl">Current Value</div></div>
    <div class="sc"><div class="sv" style="font-size:13px;color:${Number(ret)>=0?"#16a34a":"#dc2626"}">${Number(ret)>=0?"+":""}${ret}%</div><div class="sl">Return</div></div>
  </div>
  <table><thead><tr><th>Scheme</th><th>Type</th><th>Invested</th><th>Current</th><th>Return</th></tr></thead><tbody>
  ${client.investments.map((inv:any)=>{const r=inv.currentValue?((Number(inv.currentValue)-Number(inv.amount))/Number(inv.amount)*100):null;return`<tr><td style="font-weight:600">${inv.schemeName}</td><td>${inv.type.replace(/_/g," ")}</td><td>${fmt(Number(inv.amount))}</td><td>${inv.currentValue?fmt(Number(inv.currentValue)):"—"}</td><td class="${r!==null&&r>=0?"pos":"neg"}">${r!==null?(r>=0?"+":"")+r.toFixed(1)+"%":"—"}</td></tr>`;}).join("")}
  </tbody></table>
</div>`:""}
${client.goals?.length>0?`
<div class="section">
  <div class="stitle">Financial Goals</div>
  <table><thead><tr><th>Goal</th><th>Type</th><th>Target</th><th>Current</th><th>Progress</th></tr></thead><tbody>
  ${client.goals.map((g:any)=>{const p=Math.round((Number(g.currentAmount)/Number(g.targetAmount))*100);return`<tr><td style="font-weight:600">${g.title}</td><td>${g.goalType}</td><td>${fmt(Number(g.targetAmount))}</td><td>${fmt(Number(g.currentAmount))}</td><td><strong>${Math.min(100,p)}%</strong></td></tr>`;}).join("")}
  </tbody></table>
</div>`:""}
${client.residency&&client.residency.residencyType!=="RESIDENT_INDIAN"?`
<div class="section">
  <div class="stitle">NRI Details</div>
  <div class="grid3">
    <div><div class="fl">Type</div><div class="fv">${client.residency.residencyType.replace(/_/g," ")}</div></div>
    ${client.residency.countryOfResidence?`<div><div class="fl">Country</div><div class="fv">${client.residency.countryOfResidence}</div></div>`:""}
    ${client.residency.taxResidency?`<div><div class="fl">Tax Residency</div><div class="fv">${client.residency.taxResidency}</div></div>`:""}
    ${client.residency.accountType?`<div><div class="fl">Account Type</div><div class="fv">${client.residency.accountType}</div></div>`:""}
    <div><div class="fl">FATCA</div><div class="fv">${client.residency.fatcaCompliant?"Compliant":"Pending"}</div></div>
  </div>
</div>`:""}
<div class="footer"><span>MoneyKonnect CRM - Confidential</span><span>Generated ${new Date().toLocaleString("en-IN")} - ${user?.name||"Advisor"}</span></div>
</div></body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("PDF export:", error);
    return new NextResponse("Export failed", { status: 500 });
  }
}
