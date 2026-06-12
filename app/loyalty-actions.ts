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
