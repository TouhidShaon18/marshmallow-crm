"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole } from "@/lib/auth";
import { generatePostsForPeriod } from "@/lib/social-generate";
import { ALL_CHANNELS } from "@/lib/social";

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

// ── Channel ownership ──────────────────────────────────────────────────────────

/**
 * Assign each channel to an employee. Saves the mapping and bulk-applies it to
 * every template + planned post on that channel (posted/logged ones are left).
 */
export async function saveChannelAssignments(
  _prev: { ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean }> {
  await requireOwner();
  for (const ch of ALL_CHANNELS) {
    const raw = formData.get(`assign_${ch}`)?.toString() || "";
    const assignedToId = raw || null;
    await prisma.channelAssignment.upsert({
      where:  { channel: ch },
      create: { channel: ch, assignedToId },
      update: { assignedToId },
    });
    await prisma.socialTemplate.updateMany({ where: { channel: ch }, data: { assignedToId } });
    await prisma.socialPost.updateMany({ where: { channel: ch, status: "PLANNED" }, data: { assignedToId } });
  }
  revalidatePath("/social-planner");
  revalidatePath("/social-planner/templates");
  return { ok: true };
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function createTemplate(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireOwner();

  const channel   = formData.get("channel")?.toString();
  const topic     = formData.get("topic")?.toString().trim();
  const rawFreq   = formData.get("frequency")?.toString() ?? "MONTHLY";
  const frequency = ["MONTHLY", "WEEKLY", "BIWEEKLY", "DAILY"].includes(rawFreq) ? rawFreq : "MONTHLY";
  const day       = parseInt(formData.get("dayOfMonth")?.toString() ?? "");
  const dow       = parseInt(formData.get("dayOfWeek")?.toString() ?? "");

  // Parse "HH:MM" time → hour/minute (default 9:00 AM).
  const timeStr = formData.get("time")?.toString() ?? "";
  const [hStr, mStr] = timeStr.split(":");
  const postHour   = Math.min(23, Math.max(0, parseInt(hStr) || 9));
  const postMinute = Math.min(59, Math.max(0, parseInt(mStr) || 0));

  if (!channel || !topic) {
    return { error: "Channel and topic are required." };
  }
  if (frequency === "MONTHLY" && (!day || day < 1 || day > 31)) {
    return { error: "Pick a valid day of the month (1–31)." };
  }
  if ((frequency === "WEEKLY" || frequency === "BIWEEKLY") && (isNaN(dow) || dow < 0 || dow > 6)) {
    return { error: "Pick a day of the week." };
  }

  // Explicit assignee, else fall back to the channel's owner (if set).
  let assignedToId = formData.get("assignedToId")?.toString() || null;
  if (!assignedToId) {
    const owner = await prisma.channelAssignment.findUnique({ where: { channel } });
    assignedToId = owner?.assignedToId ?? null;
  }

  await prisma.socialTemplate.create({
    data: {
      channel:     channel as never,
      topic,
      notes:       formData.get("notes")?.toString().trim() || null,
      frequency,
      dayOfMonth:  frequency === "MONTHLY" ? day : 1,
      dayOfWeek:   frequency === "WEEKLY" || frequency === "BIWEEKLY" ? dow : null,
      postHour,
      postMinute,
      assignedToId,
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
