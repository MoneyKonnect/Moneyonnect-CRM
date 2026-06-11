import { NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
