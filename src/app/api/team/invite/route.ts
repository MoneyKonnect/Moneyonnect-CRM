import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "A team member";

    if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    if (role === "SUPER_ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admins can invite Super Admins" }, { status: 403 });
    }

    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Delete any existing unused invites for this email
    await db.teamInvite.deleteMany({ where: { email: email.toLowerCase(), usedAt: null } });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invite = await db.teamInvite.create({
      data: {
        email: email.toLowerCase(),
        role,
        expiresAt,
        invitedById: userId,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://relationiq.vercel.app";
    const inviteUrl = `${baseUrl}/register?token=${invite.token}`;

    await sendInviteEmail({ to: email, inviterName: userName, inviteUrl, role });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
