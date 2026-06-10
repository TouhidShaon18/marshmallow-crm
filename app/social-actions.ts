"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole } from "@/lib/auth";
import { scheduledDateFor } from "@/lib/social";

async function requireMarketing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role) && !isMarketingRole(user.role)) redirect("/marketing");
  return user;
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function createTemplate(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireMarketing();

  const channel = formData.get("channel")?.toString();
  const topic   = formData.get("topic")?.toString().trim();
  const day     = parseInt(formData.get("dayOfMonth")?.toString() ?? "");

  if (!channel || !topic || !day || day < 1 || day > 28) {
    return { error: "Channel, topic, and a valid day (1–28) are required." };
  }

  await prisma.socialTemplate.create({
    data: {
      channel:     channel as never,
      topic,
      notes:       formData.get("notes")?.toString().trim() || null,
      dayOfMonth:  day,
      assignedToId: formData.get("assignedToId")?.toString() || null,
    },
  });

  revalidatePath("/social-planner/templates");
  revalidatePath("/social-planner");
  return { ok: true };
}

export async function toggleTemplate(id: string, active: boolean): Promise<void> {
  await requireMarketing();
  await prisma.socialTemplate.update({ where: { id }, data: { active } });
  revalidatePath("/social-planner/templates");
}

export async function deleteTemplate(id: string): Promise<void> {
  await requireMarketing();
  await prisma.socialTemplate.delete({ where: { id } });
  revalidatePath("/social-planner/templates");
  revalidatePath("/social-planner");
}

// ── Monthly posts ─────────────────────────────────────────────────────────────

/** Generate this month's posts from active templates. Skips templates already generated. */
export async function generateMonth(period: string): Promise<{ created: number }> {
  await requireMarketing();

  const templates = await prisma.socialTemplate.findMany({
    where: { active: true },
  });

  // Find which templateIds already have posts in this period
  const existing = await prisma.socialPost.findMany({
    where: { period, templateId: { not: null } },
    select: { templateId: true },
  });
  const existingTemplateIds = new Set(existing.map((p) => p.templateId));

  const toCreate = templates.filter((t) => !existingTemplateIds.has(t.id));

  if (toCreate.length === 0) return { created: 0 };

  await prisma.socialPost.createMany({
    data: toCreate.map((t) => ({
      templateId:   t.id,
      channel:      t.channel,
      topic:        t.topic,
      notes:        t.notes,
      period,
      scheduledDate: scheduledDateFor(period, t.dayOfMonth),
      assignedToId: t.assignedToId,
      status:       "PLANNED" as const,
    })),
  });

  revalidatePath("/social-planner");
  return { created: toCreate.length };
}

/** Add a one-off post (not from a template). */
export async function createOneOffPost(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireMarketing();

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
  await requireMarketing();
  await prisma.socialPost.delete({ where: { id } });
  revalidatePath("/social-planner");
}

// ── Employee actions ──────────────────────────────────────────────────────────

export async function markPosted(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
