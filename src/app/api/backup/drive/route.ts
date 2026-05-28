import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getGoogleAuth } from "@/lib/google";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [leads, clients, tasks, users] = await Promise.all([
      prisma.lead.findMany({ include: { owner: { select: { name: true, email: true } } } }),
      prisma.client.findMany(),
      prisma.task.findMany(),
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    ]);
    const backup = { exportedAt: new Date().toISOString(), counts: { leads: leads.length, clients: clients.length, tasks: tasks.length, users: users.length }, data: { leads, clients, tasks, users } };
    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().split("T")[0];
    const fileName = `relationiq-backup-${date}.json`;
    const auth = getGoogleAuth();
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = tokenRes.token;
    const boundary = `boundary${Date.now()}`;
    const metadata = JSON.stringify({ name: fileName, mimeType: "application/json", parents: [FOLDER_ID] });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
    const uploadRes = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!uploadRes.ok) { const err = await uploadRes.text(); throw new Error(`Upload failed: ${uploadRes.status} ${err}`); }
    const uploaded = await uploadRes.json();
    return NextResponse.json({ success: true, file: fileName, driveLink: uploaded.webViewLink, counts: backup.counts });
  } catch (error: any) {
    console.error("Drive backup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
