import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id ?? "";
    const { id } = await params;

    const doc = await db.document.findFirst({
      where: { id },
      include: { client: { select: { ownerId: true } } },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (doc.client.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.document.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId, action: "DELETE", entityType: "document",
        entityId: id, entityName: doc.fileName,
        oldValue: { docType: doc.docType, fileName: doc.fileName },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
