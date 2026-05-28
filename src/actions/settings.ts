"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: { name: string; email: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!data.name?.trim()) return { success: false, error: "Name is required" };
    if (!data.email?.trim()) return { success: false, error: "Email is required" };

    // Check if email taken by another user
    const existing = await db.user.findFirst({
      where: { email: data.email.toLowerCase(), NOT: { id: session.user.id } },
    });
    if (existing) return { success: false, error: "Email already in use" };

    await db.user.update({
      where: { id: session.user.id },
      data: { name: data.name.trim(), email: data.email.toLowerCase() },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("updateProfile error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.password) return { success: false, error: "No password set" };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return { success: false, error: "Current password is incorrect" };

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });

    return { success: true };
  } catch (error) {
    console.error("updatePassword error:", error);
    return { success: false, error: "Failed to update password" };
  }
}
