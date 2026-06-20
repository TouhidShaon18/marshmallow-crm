"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole } from "@/lib/auth";
import { generatePostsForPeriod } from "@/lib/social-generate";

/** Only the owner can manage the planner (create/delete templates, generate months, etc.) */
async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role)) redirect("/marketing");
  return user;
}

/** Any logged-in user can log their own posts / metrics. */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function createTemplate(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const channel   = formData.get("channel")?.toString();
  const topic     = formData.get("topic")?.toString().trim();
  const frequency = formData.get("frequency")?.toString() === "DAILY" ? "DAILY" : "MONTHLY";
  const day       = parseInt(formData.get("dayOfMonth")?.toString() ?? "");

  if (!channel || !topic) {
    return { error: "Channel and topic are required." };
  }
  if (frequency === "MONTHLY" && (!day || day < 1 || day > 31)) {
    return { error: "Pick a valid day of the month (1–31), or choose “Every day”." };
  }

  await prisma.socialTemplate.create({
    data: {
      channel:     channel as never,
      topic,
      notes:       formData.get("notes")?.toString().trim() || null,
      frequency,
      dayOfMonth:  frequency === "DAILY" ? 1 : day,
      assignedToId: formData.get("assignedToId")?.toString() || null,
    },
  });

  revalidatePath("/social-planner/templates");
  revalidatePath("/social-planner");
  return { ok: true };
}

export async function toggleTemplate(id: string, active: boolean): Promise<void> {
  await requireOwner();
  await prisma.socialTemplate.update({ where: { id }, data: { active } });
  revalidatePath("/social-planner/templates");
}

export async function deleteTemplate(id: string): Promise<void> {
  await requireOwner();
  await prisma.socialTemplate.delete({ where: { id } });
  revalidatePath("/social-planner/templates");
  revalidatePath("/social-planner");
}

// ── Monthly posts ─────────────────────────────────────────────────────────────

/** Generate this month's posts from active templates. Idempotent (per template/day). */
export async function generateMonth(period: string): Promise<{ created: number }> {
  await requireOwner();
  const created = await generatePostsForPeriod(period);
  revalidatePath("/social-planner");
  return { created };
}

/** Add a one-off post (not from a template). */
export async function createOneOffPost(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const channel = formData.get("channel")?.toString();
  const topic   = formData.get("topic")?.toString().trim();
  const dateRaw = formData.get("scheduledDate")?.toString();
  if (!channel || !topic || !dateRaw) return { error: "Channel, topic, and date required." };

  const scheduledDate = new Date(dateRaw);
  const period = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, "0")}`;

  await prisma.socialPost.create({
    data: {
      channel: channel as never,
      topic,
      notes:        formData.get("notes")?.toString().trim() || null,
      period,
      scheduledDate,
      assignedToId: formData.get("assignedToId")?.toString() || null,
      status: "PLANNED",
    },
  });

  revalidatePath("/social-planner");
  return { ok: true };
}

export async function deletePost(id: string): Promise<void> {
  await requireOwner();
  await prisma.socialPost.delete({ where: { id } });
  revalidatePath("/social-planner");
}

// ── Employee actions ──────────────────────────────────────────────────────────

export async function markPosted(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireAuth();

  const id     = formData.get("postId")?.toString();
  const url    = formData.get("postUrl")?.toString().trim();
  const dateRaw = formData.get("postedAt")?.toString();
  if (!id || !url) return { error: "Post URL is required." };

  await prisma.socialPost.update({
    where: { id },
    data: {
      status:   "POSTED",
      postUrl:  url,
      postedAt: dateRaw ? new Date(dateRaw) : new Date(),
    },
  });

  revalidatePath("/social-planner");
  return {};
}

export async function logMetrics(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireAuth();

  const id = formData.get("postId")?.toString();
  if (!id) return { error: "Missing post ID." };

  const n = (key: string) => {
    const v = formData.get(key)?.toString();
    return v ? parseInt(v) : null;
  };

  await prisma.socialPost.update({
    where: { id },
    data: {
      reactCount:   n("reactCount"),
      viewCount:    n("viewCount"),
      commentCount: n("commentCount"),
      shareCount:   n("shareCount"),
      metricsLoggedAt: new Date(),
      status: "METRICS_LOGGED",
    },
  });

  revalidatePath("/social-planner");
  return {};
}
