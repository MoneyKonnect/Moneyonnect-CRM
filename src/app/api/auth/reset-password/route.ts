import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, ...rest } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing reset token" }, { status: 400 });
    }

    const parsed = resetPasswordSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid data" }, { status: 400 });
    }

    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await db.$transaction([
      db.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } }),
      db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
