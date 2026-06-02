import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@moneykonnect.in",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendInviteEmail({
  to,
  inviterName,
  inviteUrl,
  role,
}: {
  to: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}) {
  const roleLabel = role === "SUPER_ADMIN" ? "Super Admin" : "Admin";

  await transporter.sendMail({
    from: `"RelationIQ | MoneyKonnect" <info@moneykonnect.in>`,
    to,
    subject: `You have been invited to RelationIQ`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; font-size: 28px; margin: 0;">RelationIQ</h1>
          <p style="color: #64748b; margin: 5px 0 0;">by MoneyKonnect</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0 0 12px;">You have been invited!</h2>
          <p style="color: #475569; margin: 0 0 8px;">
            <strong>${inviterName}</strong> has invited you to join RelationIQ as <strong>${roleLabel}</strong>.
          </p>
          <p style="color: #475569; margin: 0;">
            Click the button below to accept your invitation and set up your account.
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${inviteUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
          This invitation expires in 24 hours. If you did not expect this email, you can safely ignore it.
        </p>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            RelationIQ &mdash; MoneyKonnect LLP &bull; info@moneykonnect.in
          </p>
        </div>
      </div>
    `,
  });
}
