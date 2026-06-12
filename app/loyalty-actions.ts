"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const REWARD_ITEMS = [
  "Pendant",
  "Keychain",
  "Anime action figure",
  "Anime plush toy",
  "Anime photo cards",
  "Anime wristband",
  "Anime-themed mousepad",
  "Anime tote bag",
  "LED anime lamp",
  "Anime square lamp",
  "Anime sticker",
  "Anime poster",
] as const;

export const RANKS = [
  { stamp: 0,  name: "—",             icon: "🎴" },
  { stamp: 1,  name: "Scout",         icon: "🔍" },
  { stamp: 2,  name: "Soul Reaper",   icon: "⚔️" },
  { stamp: 3,  name: "Hunter",        icon: "🏹" },
  { stamp: 4,  name: "Pro Hero",      icon: "🦸" },
  { stamp: 5,  name: "Hokage",        icon: "🌀" },
  { stamp: 6,  name: "Special Grade", icon: "💜" },
  { stamp: 7,  name: "S-Class Hunter",icon: "⚡" },
  { stamp: 8,  name: "Hashira",       icon: "🔥" },
  { stamp: 9,  name: "Super Saiyan",  icon: "💥" },
  { stamp: 10, name: "Pirate King",   icon: "☠️" },
] as const;

export function getRank(stampCount: number) {
  const capped = Math.min(stampCount, 10);
  return RANKS[capped];
}

/** Add one stamp. Returns the updated stampCount. */
export async function addStamp(customerId: string): Promise<void> {
  await requireUser();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { stampCount: true, pirateKingRewardClaimed: true },
  });
  if (!customer) return;

  // After stamp 10 reward is claimed the card resets — allow new stamps
  const newCount = customer.stampCount + 1;

  await prisma.customer.update({
    where: { id: customerId },
    data: { stampCount: newCount },
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
}

/** Remove the last stamp (undo). */
export async function removeStamp(customerId: string): Promise<void> {
  await requireUser();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { stampCount: true },
  });
  if (!customer || customer.stampCount <= 0) return;

  await prisma.customer.update({
    where: { id: customerId },
    data: { stampCount: customer.stampCount - 1 },
  });

  revalidatePath(`/customers/${customerId}`);
}

/** Mark the Hokage (stamp 5) reward as claimed. */
export async function claimHokageReward(customerId: string): Promise<void> {
  await requireUser();
  await prisma.customer.update({
    where: { id: customerId },
    data: { hokageRewardClaimed: true },
  });
  revalidatePath(`/customers/${customerId}`);
}

/** Mark the Pirate King (stamp 10) reward as claimed and record which item / reward type. */
export async function claimPirateKingReward(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireUser();
  const customerId = formData.get("customerId")?.toString();
  if (!customerId) return { error: "Missing customer." };

  const rewardType = formData.get("rewardType")?.toString(); // "item" | "discount"
  const item       = formData.get("item")?.toString()?.trim();

  if (rewardType === "item" && !item) return { error: "Please choose a gift item." };

  const rewardItem = rewardType === "discount" ? "50% discount up to ৳3,000" : (item ?? "");

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      pirateKingRewardClaimed: true,
      pirateKingRewardItem: rewardItem,
      // Reset card after Pirate King reward is claimed
      stampCount: 0,
      hokageRewardClaimed: false,
    },
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return {};
}
