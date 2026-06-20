import "server-only";

import { prisma } from "@/lib/db";
import { scheduledDatesFor } from "@/lib/social";

/**
 * Generate planned posts for a period from active recurring templates.
 * - MONTHLY templates → one post on their dayOfMonth.
 * - DAILY templates   → one post per calendar day.
 * Idempotent: dedupes per (template, calendar day), so re-running fills only
 * the gaps and never duplicates.
 */
export async function generatePostsForPeriod(period: string): Promise<number> {
  const templates = await prisma.socialTemplate.findMany({ where: { active: true } });
  if (templates.length === 0) return 0;

  const existing = await prisma.socialPost.findMany({
    where: { period, templateId: { not: null } },
    select: { templateId: true, scheduledDate: true },
  });
  const seen = new Set(existing.map((p) => `${p.templateId}:${new Date(p.scheduledDate).getDate()}`));

  const data: {
    templateId: string; channel: (typeof templates)[number]["channel"]; topic: string;
    notes: string | null; period: string; scheduledDate: Date; assignedToId: string | null;
    status: "PLANNED";
  }[] = [];

  for (const t of templates) {
    for (const date of scheduledDatesFor(period, t)) {
      const key = `${t.id}:${date.getDate()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({
        templateId: t.id,
        channel: t.channel,
        topic: t.topic,
        notes: t.notes,
        period,
        scheduledDate: date,
        assignedToId: t.assignedToId,
        status: "PLANNED",
      });
    }
  }

  if (data.length === 0) return 0;
  await prisma.socialPost.createMany({ data });
  return data.length;
}
