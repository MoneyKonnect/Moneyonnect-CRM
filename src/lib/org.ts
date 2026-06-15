import { db } from "@/lib/db";

/**
 * Returns the IDs of all users in the organization.
 * Used to make data org-wide: any team member can view/edit
 * records regardless of which user is recorded as the owner.
 */
export async function getOrgUserIds(): Promise<string[]> {
  const users = await db.user.findMany({ select: { id: true } });
  return users.map((u) => u.id);
}
