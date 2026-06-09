import { NextRequest, NextResponse } from "next/server";

const KEY = "b85ba5057f173e2b7363a717e2c48211";
const TOKEN = "ATTAe72af857fc3777acd049412149d0ee7e4bcd39544074e0b24536219555f32883EBE15FEE";
const BASE = "https://api.trello.com/1";

export async function POST(req: NextRequest) {
  try {
    const { path, method, body } = await req.json();
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}key=${KEY}&token=${TOKEN}`, {
      method: method || "POST",
      headers: { "Content-Type": "application/json" },
      ...(body && method !== "DELETE" ? { body: JSON.stringify(body) } : {}),
    });

    // Safely parse — Trello sometimes returns plain text errors
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) return NextResponse.json({ error: data?.message || text }, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
