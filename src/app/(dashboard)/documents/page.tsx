import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentsClient } from "@/components/documents/documents-client";

export const metadata: Metadata = { title: "Documents" };

async function getDocuments(userId: string) {
  return db.document.findMany({
    where: { client: { ownerId: userId } },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, fullName: true } },
    },
    take: 100,
  });
}

export default async function DocumentsPage() {
  const session = await auth();
  const documents = await getDocuments((session?.user as any)?.id ?? "");

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <DocumentsClient documents={documents} />
    </div>
  );
}
