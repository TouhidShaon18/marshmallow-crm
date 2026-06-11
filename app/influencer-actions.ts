"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole, normaliseRole } from "@/lib/auth";

async function requireMarketing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isMarketingRole(role)) redirect("/dashboard");
  return user;
}

// ── Influencer CRUD ───────────────────────────────────────────────────────────

export async function createInfluencer(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();

  const name   = formData.get("name")?.toString().trim();
  const handle = formData.get("socialHandle")?.toString().trim();
  if (!name || !handle) return { error: "Name and social handle are required." };

  const followers = formData.get("followerCount")?.toString();

  await prisma.influencer.create({
    data: {
      name,
      socialHandle: handle,
      platform:     (formData.get("platform")?.toString() ?? "INSTAGRAM") as never,
      followerCount: followers ? parseInt(followers) : null,
      email:   formData.get("email")?.toString().trim()  || null,
      phone:   formData.get("phone")?.toString().trim()  || null,
      niche:   formData.get("niche")?.toString().trim()  || null,
      notes:   formData.get("notes")?.toString().trim()  || null,
    },
  });

  revalidatePath("/influencers");
  redirect("/influencers");
}

export async function updateInfluencer(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();

  const id     = formData.get("id")?.toString();
  const name   = formData.get("name")?.toString().trim();
  const handle = formData.get("socialHandle")?.toString().trim();
  if (!id || !name || !handle) return { error: "Missing required fields." };

  const followers = formData.get("followerCount")?.toString();

  await prisma.influencer.update({
    where: { id },
    data: {
      name,
      socialHandle: handle,
      platform:     (formData.get("platform")?.toString() ?? "INSTAGRAM") as never,
      followerCount: followers ? parseInt(followers) : null,
      email:   formData.get("email")?.toString().trim()  || null,
      phone:   formData.get("phone")?.toString().trim()  || null,
      niche:   formData.get("niche")?.toString().trim()  || null,
      notes:   formData.get("notes")?.toString().trim()  || null,
    },
  });

  revalidatePath("/influencers");
  revalidatePath(`/influencers/${id}`);
  return {};
}

export async function deleteInfluencer(id: string): Promise<void> {
  await requireMarketing();
  await prisma.influencer.delete({ where: { id } });
  revalidatePath("/influencers");
  redirect("/influencers");
}

// ── Deal CRUD ─────────────────────────────────────────────────────────────────

export async function createDeal(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();

  const influencerId = formData.get("influencerId")?.toString();
  const title        = formData.get("title")?.toString().trim();
  if (!influencerId || !title) return { error: "Title is required." };

  const n = (k: string) => { const v = formData.get(k)?.toString(); return v ? parseFloat(v) : null; };
  const i = (k: string) => { const v = formData.get(k)?.toString(); return v ? parseInt(v)   : null; };
  const d = (k: string) => { const v = formData.get(k)?.toString(); return v ? new Date(v)   : null; };
  const s = (k: string) => formData.get(k)?.toString().trim() || null;

  await prisma.influencerDeal.create({
    data: {
      influencerId,
      campaignId:   s("campaignId"),
      title,
      startDate:    d("startDate"),
      endDate:      d("endDate"),
      amountPaid:   n("amountPaid"),
      paymentNotes: s("paymentNotes"),
      reach:        i("reach"),
      interactions: i("interactions"),
      clicks:       i("clicks"),
      conversions:  i("conversions"),
      postUrl:      s("postUrl"),
      notes:        s("notes"),
    },
  });

  revalidatePath(`/influencers/${influencerId}`);
  return {};
}

export async function updateDeal(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireMarketing();

  const id           = formData.get("id")?.toString();
  const influencerId = formData.get("influencerId")?.toString();
  const title        = formData.get("title")?.toString().trim();
  if (!id || !influencerId || !title) return { error: "Missing required fields." };

  const n = (k: string) => { const v = formData.get(k)?.toString(); return v ? parseFloat(v) : null; };
  const i = (k: string) => { const v = formData.get(k)?.toString(); return v ? parseInt(v)   : null; };
  const d = (k: string) => { const v = formData.get(k)?.toString(); return v ? new Date(v)   : null; };
  const s = (k: string) => formData.get(k)?.toString().trim() || null;

  await prisma.influencerDeal.update({
    where: { id },
    data: {
      campaignId:   s("campaignId"),
      title,
      startDate:    d("startDate"),
      endDate:      d("endDate"),
      amountPaid:   n("amountPaid"),
      paymentNotes: s("paymentNotes"),
      reach:        i("reach"),
      interactions: i("interactions"),
      clicks:       i("clicks"),
      conversions:  i("conversions"),
      postUrl:      s("postUrl"),
      notes:        s("notes"),
    },
  });

  revalidatePath(`/influencers/${influencerId}`);
  return {};
}

export async function deleteDeal(id: string, influencerId: string): Promise<void> {
  await requireMarketing();
  await prisma.influencerDeal.delete({ where: { id } });
  revalidatePath(`/influencers/${influencerId}`);
}
