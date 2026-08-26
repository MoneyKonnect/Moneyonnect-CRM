import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `https://moneykonnect-crm.vercel.app/settings?gmail_error=${encodeURIComponent(error)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(
      `https://moneykonnect-crm.vercel.app/settings?gmail_error=no_code`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_GMAIL_CLIENT_ID!,
        client_secret: process.env.GOOGLE_GMAIL_CLIENT_SECRET!,
        redirect_uri: "https://moneykonnect-crm.vercel.app/api/auth/gmail/callback",
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Gmail OAuth token exchange failed:", tokens);
      return NextResponse.redirect(
        `https://moneykonnect-crm.vercel.app/settings?gmail_error=token_exchange_failed`
      );
    }

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `https://moneykonnect-crm.vercel.app/settings?gmail_error=no_refresh_token`
      );
    }

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const profile = await profileRes.json();
    const email = profile.email || "unknown";

    const session = await auth();
    const connectedById = (session?.user as any)?.id || null;

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await prisma.gmailAuthToken.upsert({
      where: { email },
      update: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiresAt,
        scopes: tokens.scope || "",
        connectedById,
        connectedAt: new Date(),
      },
      create: {
        email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiresAt,
        scopes: tokens.scope || "",
        connectedById,
      },
    });

    return NextResponse.redirect(
      `https://moneykonnect-crm.vercel.app/settings?gmail_connected=1`
    );
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `https://moneykonnect-crm.vercel.app/settings?gmail_error=internal_error`
    );
  }
}
