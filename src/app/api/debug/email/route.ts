import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
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

    // Verify connection
    await transporter.verify();
    
    // Send test email
    await transporter.sendMail({
      from: '"RelationIQ" <info@moneykonnect.in>',
      to: "aditya.anthwal@moneykonnect.in",
      subject: "RelationIQ Email Test",
      html: "<p>Email is working! ✅</p>",
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email sent!",
      gmailPasswordSet: !!process.env.GMAIL_APP_PASSWORD,
      passwordLength: process.env.GMAIL_APP_PASSWORD?.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      gmailPasswordSet: !!process.env.GMAIL_APP_PASSWORD,
      passwordLength: process.env.GMAIL_APP_PASSWORD?.length
    });
  }
}
