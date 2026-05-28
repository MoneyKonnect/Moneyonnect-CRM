import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;
    const docType = formData.get("docType") as string;
    const familyMemberId = formData.get("familyMemberId") as string | null;
    const expiresAt = formData.get("expiresAt") as string | null;

    if (!file || !clientId || !docType) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const client = await db.client.findFirst({ where: { id: clientId, ownerId: userId, deletedAt: null } });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const s3Key = `documents/${userId}/${clientId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const doc = await db.document.create({
      data: {
        clientId, familyMemberId: familyMemberId || null,
        documentFor: familyMemberId ? "FAMILY_MEMBER" : "CLIENT",
        docType, fileName: file.name, s3Key,
        mimeType: file.type, fileSize: file.size, encrypted: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await db.auditLog.create({
      data: { userId, action: "DOCUMENT_UPLOAD", entityType: "document", entityId: doc.id, entityName: file.name, newValue: { docType, clientId } },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
