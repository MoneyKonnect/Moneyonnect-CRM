import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    let inviteData: any = null;
    if (token) {
      inviteData = await db.teamInvite.findUnique({ where: { token } });
      if (!inviteData || inviteData.used || inviteData.expiresAt < new Date()) {
        return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
      }
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    if (inviteData && inviteData.email !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match invite" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: inviteData ? inviteData.role : "ADVISOR",
      },
    });

    if (inviteData) {
      await db.teamInvite.update({ where: { id: inviteData.id }, data: { used: true } });
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
