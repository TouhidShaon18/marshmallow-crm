"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole } from "@/lib/auth";

async function requireMarketing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role) && !isMarketingRole(user.role)) redirect("/marketing");
  return user;
}

export async function createCampaign(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireMarketing();

  const name = formData.get("name")?.toString().trim();
  const channel = formData.get("channel")?.toString().trim();
  if (!name || !channel) return { error: "Name and channel are required." };

  const budgetRaw = formData.get("budget")?.toString();
  const startRaw  = formData.get("startDate")?.toString();
  const endRaw    = formData.get("endDate")?.toString();

  await prisma.campaign.create({
    data: {
      name,
      channel,
      budget:    budgetRaw ? parseFloat(budgetRaw) : null,
      startDate: startRaw  ? new Date(startRaw)    : null,
      endDate:   endRaw    ? new Date(endRaw)       : null,
      notes:     formData.get("notes")?.toString().trim() || null,
    },
  });

  revalidatePath("/campaigns");
  revalidatePath("/marketing");
  return { ok: true };
}

export async function deleteCampaign(id: string): Promise<void> {
  await requireMarketing();
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  revalidatePath("/marketing");
}
