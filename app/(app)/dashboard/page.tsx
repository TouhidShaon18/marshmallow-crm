import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, normaliseRole, isMarketingRole, isOwnerRole, roleLabel } from "@/lib/auth";
import AiBriefing, { AiBriefingSkeleton } from "@/components/ai-briefing";
import { TargetCard, MarketingTargetCard } from "@/components/target-progress";
import { getTargetProgress, getMarketingProgress } from "@/app/target-actions";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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
  const isOwner = isOwnerRole(user.role);
  const period = currentPeriod();

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

  // ── Owner-only data ──────────────────────────────────────────────────────
  const team = isOwner
    ? await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, role: true,
          _count: { select: { customers: true } },
        },
      })
    : [];

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

  // Team targets (owner sees all employees)
  const employees = isOwner
    ? team.filter((t) => t.role === "EMPLOYEE" || t.role === "SALES" || t.role === "MARKETING")
    : [];

  const employeeTargets = isOwner
    ? await prisma.employeeTarget.findMany({
        where: { period, userId: { in: employees.map((e) => e.id) } },
      })
    : [];

  const targetMap = Object.fromEntries(employeeTargets.map((t) => [t.userId, t]));

  // Fetch progress per employee (sales vs marketing)
  const salesProgressMap: Record<string, Awaited<ReturnType<typeof getTargetProgress>>> = {};
  const mktProgressMap: Record<string, Awaited<ReturnType<typeof getMarketingProgress>>> = {};

  if (isOwner) {
    await Promise.all(
      employees.map(async (e) => {
        const role = normaliseRole(e.role);
        if (isMarketingRole(role)) {
          mktProgressMap[e.id] = await getMarketingProgress(e.id, period);
        } else {
          salesProgressMap[e.id] = await getTargetProgress(e.id, period);
        }
      }),
    );
  }

  // Employee's own target
  const myRole     = normaliseRole(user.role);
  const myIsMkt    = isMarketingRole(myRole);
  const myTarget   = !isOwner ? await prisma.employeeTarget.findUnique({ where: { userId_period: { userId: user.id, period } } }) : null;
  const myProgress = !isOwner && !myIsMkt ? await getTargetProgress(user.id, period) : null;
  const myMktProgress = !isOwner && myIsMkt ? await getMarketingProgress(user.id, period) : null;

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

      <Suspense fallback={<AiBriefingSkeleton />}>
        <AiBriefing />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total customers" value={totalCustomers} href="/customers" />
        <StatCard label="Tasks due today" value={tasksDue} href="/tasks" />
        <StatCard label="Follow-ups due" value={followupCount} href="/followups" />
        <StatCard label="Contacts this week" value={contactedThisWeek} />
      </div>

      {/* Employee: own target progress */}
      {!isOwner && myTarget && (
        <div className="card p-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
            Your target — {period}
          </h2>
          {myIsMkt && myMktProgress ? (
            <MarketingTargetCard name={user.name} target={myTarget} actual={myMktProgress} />
          ) : myProgress ? (
            <TargetCard name={user.name} target={myTarget} actual={myProgress} />
          ) : null}
        </div>
      )}

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
                    {new Date(it.createdAt).toLocaleString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
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
                        {(t.role === "OWNER" || t.role === "ADMIN" || t.role === "MANAGER") && (
                          <span className="badge ml-2 bg-brand-100 text-brand-700">{roleLabel(normaliseRole(t.role))}</span>
                        )}
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

      {/* Owner: team targets this month */}
      {isOwner && employees.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-900">Team targets — {period}</h2>
            <Link href="/team" className="text-sm text-brand-600 hover:underline">Edit targets →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {employees.map((e) => {
              const role  = normaliseRole(e.role);
              const isMkt = isMarketingRole(role);
              const tgt   = targetMap[e.id] ?? null;
              return isMkt ? (
                <MarketingTargetCard
                  key={e.id}
                  name={e.name}
                  target={tgt ?? { postsTarget: null, viewsTarget: null, reactsTarget: null, commentsTarget: null, sharesTarget: null }}
                  actual={mktProgressMap[e.id] ?? { posts: 0, views: 0, reacts: 0, comments: 0, shares: 0 }}
                />
              ) : (
                <TargetCard
                  key={e.id}
                  name={e.name}
                  target={tgt ?? { revenueTarget: null, contactTarget: null, followup7dTarget: null, followup30dTarget: null, convertedSaleTarget: null, repeatSaleTarget: null, newCustomerTarget: null }}
                  actual={salesProgressMap[e.id] ?? { revenue: 0, contacts: 0, followup7d: 0, followup30d: 0, convertedSales: 0, repeatSales: 0, newCustomers: 0 }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
