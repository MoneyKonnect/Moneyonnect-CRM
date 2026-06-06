import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") || "aditya.anthwal@moneykonnect.in";
  
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "info@moneykonnect.in",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: '"MoneyKonnect CRM" <info@moneykonnect.in>',
      to,
      subject: "MoneyKonnect CRM Team Invite Test",
      html: `<p>Test invite email sent to <b>${to}</b> ✅</p><p>If you received this, email is working!</p>`,
    });

    return NextResponse.json({ success: true, sentTo: to });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, code: error.code });
  }
}
