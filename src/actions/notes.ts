"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getOrgUserIds } from "@/lib/org";

export async function createNote(clientId: string, content: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const orgUserIds = await getOrgUserIds();
    const client = await db.client.findFirst({ where: { id: clientId, ownerId: { in: orgUserIds }, deletedAt: null } });
    if (!client) return { success: false, error: "Client not found" };
    if (!content.trim()) return { success: false, error: "Content required" };
    const note = await db.note.create({
      data: { clientId, authorId: session.user.id, content: content.trim() },
    });
    revalidatePath(`/clients/${clientId}`);
    return { success: true, note };
  } catch (error) {
    return { success: false, error: "Failed to create note" };
  }
}

export async function deleteNote(noteId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const orgUserIds = await getOrgUserIds();
    const note = await db.note.findFirst({ where: { id: noteId, authorId: { in: orgUserIds } } });
    if (!note) return { success: false, error: "Note not found" };
    await db.note.delete({ where: { id: noteId } });
    revalidatePath(`/clients/${note.clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete note" };
  }
}

export async function toggleNotePin(noteId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const orgUserIds = await getOrgUserIds();
    const note = await db.note.findFirst({ where: { id: noteId, authorId: { in: orgUserIds } } });
    if (!note) return { success: false, error: "Note not found" };
    const updated = await db.note.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    });
    revalidatePath(`/clients/${note.clientId}`);
    return { success: true, note: updated };
  } catch (error) {
    return { success: false, error: "Failed to update note" };
  }
}

export async function updateNote(noteId: string, content: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const orgUserIds = await getOrgUserIds();
    const note = await db.note.findFirst({ where: { id: noteId, authorId: { in: orgUserIds } } });
    if (!note) return { success: false, error: "Note not found" };
    const updated = await db.note.update({ where: { id: noteId }, data: { content } });
    revalidatePath(`/clients/${note.clientId}`);
    return { success: true, note: updated };
  } catch (error) {
    return { success: false, error: "Failed to update note" };
  }
}
