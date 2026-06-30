import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "info@moneykonnect.in",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
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
    from: `"MoneyKonnect CRM" <info@moneykonnect.in>`,
    to,
    subject: `You have been invited to MoneyKonnect CRM`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3fd1b8; font-size: 28px; margin: 0;">MoneyKonnect CRM</h1>
          <p style="color: #64748b; margin: 5px 0 0;">by MoneyKonnect</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0 0 12px;">You have been invited!</h2>
          <p style="color: #475569; margin: 0 0 8px;">
            <strong>${inviterName}</strong> has invited you to join MoneyKonnect CRM as <strong>${roleLabel}</strong>.
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
            MoneyKonnect CRM &mdash; MoneyKonnect LLP &bull; info@moneykonnect.in
          </p>
        </div>
      </div>
    `,
  });
}


export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  await transporter.sendMail({
    from: `"MoneyKonnect CRM" <info@moneykonnect.in>`,
    to,
    subject: `Reset your MoneyKonnect CRM password`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3fd1b8; font-size: 28px; margin: 0;">MoneyKonnect CRM</h1>
          <p style="color: #64748b; margin: 5px 0 0;">by MoneyKonnect</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0 0 12px;">Reset your password</h2>
          <p style="color: #475569; margin: 0;">
            We received a request to reset your MoneyKonnect CRM password. Click the button below to choose a new one.
          </p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="background: #3fd1b8; color: #0f172a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
          This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            MoneyKonnect CRM &mdash; MoneyKonnect LLP &bull; info@moneykonnect.in
          </p>
        </div>
      </div>
    `,
  });
}


export async function sendBirthdayWishEmail({
  to,
  name,
  message,
  attachment,
}: {
  to: string;
  name: string;
  message: string;
  attachment?: { filename: string; content: Buffer } | null;
}) {
  const mailOptions: any = {
    from: `"MoneyKonnect" <info@moneykonnect.in>`,
    to,
    subject: `Happy Birthday, ${name}! \u{1F389}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3fd1b8; font-size: 28px; margin: 0;">MoneyKonnect</h1>
        </div>
        <div style="background: #fff5f7; border-radius: 12px; padding: 30px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 40px; margin: 0 0 12px;">\u{1F382}</p>
          <h2 style="color: #0f172a; margin: 0 0 16px;">Happy Birthday, ${name}!</h2>
          <p style="color: #475569; margin: 0; white-space: pre-wrap; text-align: left;">${message}</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            MoneyKonnect &bull; info@moneykonnect.in
          </p>
        </div>
      </div>
    `,
  };

  if (attachment) {
    mailOptions.attachments = [
      {
        filename: attachment.filename,
        content: attachment.content,
      },
    ];
  }

  await transporter.sendMail(mailOptions);
}
