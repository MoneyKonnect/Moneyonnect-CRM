// src/app/api/backup/drive/route.ts
// Called by Vercel Cron: daily at midnight IST (18:30 UTC)
// Exports full DB as JSON and uploads to Google Drive

import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getGoogleAuth, getDriveClient } from "@/lib/google";
import { Readable } from "stream";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all data
    const [leads, clients, tasks, users, campaigns, webinars] =
      await Promise.all([
        prisma.lead.findMany({ include: { owner: { select: { name: true, email: true } } } }),
        prisma.client.findMany(),
        prisma.task.findMany(),
        prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
        prisma.campaign.findMany().catch(() => []),
        prisma.webinar.findMany().catch(() => []),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      counts: {
        leads: leads.length,
        clients: clients.length,
        tasks: tasks.length,
        users: users.length,
        campaigns: campaigns.length,
        webinars: webinars.length,
      },
      data: { leads, clients, tasks, users, campaigns, webinars },
    };

    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const fileName = `relationiq-backup-${date}.json`;

    // Upload to Google Drive
    const auth = getGoogleAuth();
    const drive = getDriveClient(auth);

    // Check if today's backup already exists and delete it
    const existing = await drive.files.list({
      q: `name='${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: "files(id, name)",
    });

    for (const file of existing.data.files ?? []) {
      await drive.files.delete({ fileId: file.id! });
    }

    // Upload new backup
    const stream = Readable.from([Buffer.from(json, "utf-8")]);

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/json",
        parents: [DRIVE_FOLDER_ID],
        description: `RelationIQ CRM backup — ${leads.length} leads, ${clients.length} clients`,
      },
      media: {
        mimeType: "application/json",
        body: stream,
      },
      fields: "id, name, webViewLink",
    });

    // Also keep only last 30 backups — delete older ones
    const allBackups = await drive.files.list({
      q: `name contains 'relationiq-backup-' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      orderBy: "createdTime desc",
      fields: "files(id, name, createdTime)",
    });

    const files = allBackups.data.files ?? [];
    if (files.length > 30) {
      const toDelete = files.slice(30);
      for (const f of toDelete) {
        await drive.files.delete({ fileId: f.id! });
      }
    }

    return NextResponse.json({
      success: true,
      file: fileName,
      driveLink: uploaded.data.webViewLink,
      counts: backup.counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Drive backup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
