import { prisma } from "@/lib/db";
import { getDashboardBriefing } from "@/lib/ai";

// Async server component — rendered inside a <Suspense> on the dashboard.
// Returns null (renders nothing) when ANTHROPIC_API_KEY is not set.
export default async function AiBriefing() {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86_400_000);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalCustomers, followupDue, tasksDue, contactedThisWeek, allWithBirthday] =
    await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: { OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: sevenDaysAgo } }] },
      }),
      prisma.task.count({ where: { status: "PENDING", dueAt: { lte: endOfToday } } }),
      prisma.interaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.customer.findMany({
        where: { birthday: { not: null } },
        select: { name: true, birthday: true },
      }),
    ]);

  // Upcoming birthdays this week (match month+day regardless of year)
  const today = new Date();
  const birthdaysSoon = allWithBirthday
    .filter((c) => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      const diff = thisYear.getTime() - today.getTime();
      return diff >= 0 && diff <= 7 * 86_400_000;
    })
    .map((c) => c.name);

  const briefing = await getDashboardBriefing({
    totalCustomers,
    followupDue,
    tasksDue,
    contactedThisWeek,
    birthdaysSoon,
  });

  if (!briefing) return null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-200">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-200">
        ✨ AI Daily Briefing
      </p>
      <p className="text-sm leading-relaxed text-white/90">{briefing}</p>
    </div>
  );
}

// Skeleton shown while the AI is thinking
export function AiBriefingSkeleton() {
  return (
    <div className="rounded-xl bg-brand-100 p-5 animate-pulse">
      <div className="mb-2 h-3 w-32 rounded bg-brand-200" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-200" />
        <div className="h-3 w-4/5 rounded bg-brand-200" />
      </div>
    </div>
  );
}
