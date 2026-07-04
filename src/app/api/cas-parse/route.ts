import { NextRequest, NextResponse } from "next/server";


function normalizeCasparserResponse(raw: any): any {
  if (!raw || !raw.folios) return raw;

  const firstFolio = raw.folios[0] || {};
  const investor_info = {
    name: raw.investor_info?.name || firstFolio.name || "",
    pan: firstFolio.PAN || "",
    email: raw.investor_info?.email || "",
    mobile: raw.investor_info?.mobile || "",
    address: raw.investor_info?.address || "",
  };

  const mfAccount: any = {
    name: "CAMS / KFintech",
    type: raw.file_type || "CAMS",
    mutual_funds: [],
    equities: [],
    bonds: [],
  };

  for (const folio of raw.folios || []) {
    for (const scheme of folio.schemes || []) {
      const val = parseFloat(scheme.valuation?.value || "0") || 0;
      const nav = parseFloat(scheme.valuation?.nav || "0") || 0;
      const balance = parseFloat(scheme.close || "0") || 0;
      const cost = parseFloat(scheme.valuation?.cost || "0") || 0;

      mfAccount.mutual_funds.push({
        name: scheme.scheme || "",
        isin: scheme.isin || "",
        amfi: scheme.amfi || "",
        folio: folio.folio || "",
        amc: folio.amc || "",
        balance,
        nav,
        value: val,
        avg_cost: balance > 0 ? cost / balance : 0,
        total_cost: cost,
        pnl: val - cost,
      });
    }
  }

  return {
    file_type: raw.file_type || "CAMS",
    cas_type: raw.cas_type || "DETAILED",
    statement_period: raw.statement_period || {},
    investor_info,
    accounts: mfAccount.mutual_funds.length > 0 ? [mfAccount] : [],
    folios: raw.folios,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const password = formData.get("password") as string;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const pythonForm = new FormData();
    pythonForm.append("file", file as Blob);
    pythonForm.append("password", password || "");

    const res = await fetch(process.env.CAS_SERVICE_URL!, {
      method: "POST",
      body: pythonForm,
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.detail || "Parse failed" }, { status: res.status });
    return NextResponse.json(normalizeCasparserResponse(data));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
