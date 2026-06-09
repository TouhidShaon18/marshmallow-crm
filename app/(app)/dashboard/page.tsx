import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="card p-5">
      <p className="text-3xl font-bold text-brand-700">{value}</p>
      <p className="mt-1 text-sm text-brand-700/70">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isOwner = user.role === "OWNER";

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const followupWhere = {
    OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: sevenDaysAgo } }],
  };

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalCustomers, repeatCustomers, followupCount, tasksDue, contactedThisWeek, recent] =
    await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { repeatCustomer: true } }),
      prisma.customer.count({ where: followupWhere }),
      prisma.task.count({ where: { status: "PENDING", dueAt: { lte: endOfToday } } }),
      prisma.interaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.interaction.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          employee: { select: { name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

  // Owner-only: activity per team member.
  const team = isOwner
    ? await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { customers: true } },
        },
      })
    : [];

  // Per-employee activity this week, split by channel (WhatsApp is the main one).
  const weeklyByEmployee = isOwner
    ? await prisma.interaction.groupBy({
        by: ["employeeId", "type"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { _all: true },
      })
    : [];
  type ChannelCounts = { whatsapp: number; sms: number; email: number };
  const weeklyMap = new Map<string, ChannelCounts>();
  for (const w of weeklyByEmployee) {
    if (!w.employeeId) continue;
    const c = weeklyMap.get(w.employeeId) ?? { whatsapp: 0, sms: 0, email: 0 };
    if (w.type === "WHATSAPP") c.whatsapp += w._count._all;
    else if (w.type === "SMS") c.sms += w._count._all;
    else if (w.type === "EMAIL") c.email += w._count._all;
    weeklyMap.set(w.employeeId, c);
  }
  const emptyCounts: ChannelCounts = { whatsapp: 0, sms: 0, email: 0 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">
          {isOwner ? "Owner dashboard" : `Hi ${user.name.split(" ")[0]} 👋`}
        </h1>
        <p className="text-sm text-brand-700/70">
          {isOwner ? "Everything across your store at a glance." : "Here's what needs your attention today."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total customers" value={totalCustomers} href="/customers" />
        <StatCard label="Tasks due today" value={tasksDue} href="/tasks" />
        <StatCard label="Follow-ups due" value={followupCount} href="/followups" />
        <StatCard label="Contacts this week" value={contactedThisWeek} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
            Recent activity
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-brand-700/60">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((it) => (
                <li key={it.id} className="text-sm">
                  <span className="font-medium text-brand-900">{it.employee?.name ?? "Someone"}</span>
                  <span className="text-brand-700/70"> {it.type.toLowerCase()} · </span>
                  <Link href={`/customers/${it.customer.id}`} className="text-brand-700 hover:underline">
                    {it.customer.name}
                  </Link>
                  <span className="block text-xs text-brand-700/50">
                    {new Date(it.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Owner: team activity. Employee: quick links */}
        {isOwner ? (
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
              Team activity (this week)
            </h2>
            <p className="mb-3 text-xs text-brand-700/60">
              💬 WhatsApp is your main 1-to-1 channel. SMS &amp; Email are promo blasts.
            </p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-brand-700/60">
                <tr>
                  <th className="pb-2">Member</th>
                  <th className="pb-2 text-center">👥</th>
                  <th className="pb-2 text-center text-brand-700">💬 WA</th>
                  <th className="pb-2 text-center">📱 SMS</th>
                  <th className="pb-2 text-center">📧 Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {team.map((t) => {
                  const c = weeklyMap.get(t.id) ?? emptyCounts;
                  return (
                    <tr key={t.id}>
                      <td className="py-2">
                        {t.name}
                        {t.role === "OWNER" && <span className="badge ml-2 bg-brand-100 text-brand-700">owner</span>}
                      </td>
                      <td className="py-2 text-center text-brand-700/70">{t._count.customers}</td>
                      <td className="py-2 text-center text-base font-bold text-brand-700">{c.whatsapp}</td>
                      <td className="py-2 text-center text-brand-700/70">{c.sms}</td>
                      <td className="py-2 text-center text-brand-700/70">{c.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
              Quick actions
            </h2>
            <div className="flex flex-col gap-3">
              <Link href="/customers/new" className="btn-primary">+ Add a customer</Link>
              <Link href="/followups" className="btn-secondary">View follow-ups ({followupCount})</Link>
              <Link href="/customers" className="btn-secondary">Browse all customers</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
