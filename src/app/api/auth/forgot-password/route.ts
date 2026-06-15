import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid email" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await db.user.findUnique({ where: { email } });

    // Always return success, regardless of whether the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const resetToken = await db.passwordResetToken.create({
        data: { userId: user.id, expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "https://moneykonnect-crm.vercel.app";
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken.token}`;

      await sendPasswordResetEmail({ to: email, resetUrl });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
