import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isMarketingRole, isOwnerRole } from "@/lib/auth";

const LEAD_SOURCE_EMOJI: Record<string, string> = {
  Instagram: "📸",
  TikTok: "🎵",
  Facebook: "👍",
  Referral: "🤝",
  "Walk-in": "🚶",
  Online: "🌐",
  Other: "📌",
};

export default async function MarketingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isMarketingRole(user.role) && !isOwnerRole(user.role)) redirect("/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    newThisMonth,
    leadSources,
    recentBroadcasts,
    campaigns,
    activeCampaigns,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.customer.groupBy({
      by: ["leadSource"],
      _count: { _all: true },
      orderBy: { _count: { leadSource: "desc" } },
    }),
    prisma.broadcast.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, channel: true, status: true, sentAt: true, recipientCount: true },
    }),
    prisma.campaign.count(),
    prisma.campaign.count({
      where: {
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
        startDate: { lte: now },
      },
    }),
  ]);

  const knownLeadSources = leadSources.filter((r) => r.leadSource);
  const unknownCount = leadSources.find((r) => !r.leadSource)?._count._all ?? 0;
  const totalWithSource = knownLeadSources.reduce((s, r) => s + r._count._all, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Marketing Hub</h1>
        <p className="text-sm text-brand-700/70">
          Leads, campaigns, and broadcast performance at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{totalCustomers}</p>
          <p className="mt-1 text-sm text-brand-700/70">Total leads / customers</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{newThisMonth}</p>
          <p className="mt-1 text-sm text-brand-700/70">New this month</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{campaigns}</p>
          <p className="mt-1 text-sm text-brand-700/70">Total campaigns</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{activeCampaigns}</p>
          <p className="mt-1 text-sm text-brand-700/70">Active campaigns</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead sources */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
              Leads by source
            </h2>
            <span className="text-xs text-brand-700/50">{totalWithSource} tracked</span>
          </div>
          {knownLeadSources.length === 0 ? (
            <p className="text-sm text-brand-700/50">
              No lead source data yet. Add a{" "}
              <Link href="/customers/new" className="text-brand-600 hover:underline">
                customer
              </Link>{" "}
              and set their lead source.
            </p>
          ) : (
            <div className="space-y-3">
              {knownLeadSources.map((row) => {
                const src = row.leadSource!;
                const pct = totalWithSource > 0 ? Math.round((row._count._all / totalWithSource) * 100) : 0;
                return (
                  <div key={src} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-brand-900">
                        {LEAD_SOURCE_EMOJI[src] ?? "📌"} {src}
                      </span>
                      <span className="text-brand-700/70">
                        {row._count._all} <span className="text-brand-700/40">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {unknownCount > 0 && (
                <p className="text-xs text-brand-700/40">
                  + {unknownCount} without a source tracked
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent broadcasts */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
              Recent broadcasts
            </h2>
            <Link href="/broadcasts" className="text-xs text-brand-600 hover:underline">
              All broadcasts →
            </Link>
          </div>
          {recentBroadcasts.length === 0 ? (
            <p className="text-sm text-brand-700/50">
              No broadcasts yet.{" "}
              <Link href="/broadcasts" className="text-brand-600 hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {recentBroadcasts.map((b) => (
                <li key={b.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/broadcasts/${b.id}`}
                        className="text-sm font-medium text-brand-900 hover:underline"
                      >
                        {b.name}
                      </Link>
                      <p className="text-xs text-brand-700/50">
                        {b.channel} ·{" "}
                        {b.sentAt
                          ? new Date(b.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                          : "not sent"}
                        {b.recipientCount > 0 && ` · ${b.recipientCount} recipients`}
                      </p>
                    </div>
                    <span
                      className={`badge text-xs ${
                        b.status === "SENT"
                          ? "bg-green-100 text-green-700"
                          : b.status === "SCHEDULED"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {b.status.toLowerCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/broadcasts" className="btn-primary">📣 New broadcast</Link>
          <Link href="/campaigns" className="btn-secondary">🚀 View campaigns</Link>
          <Link href="/automations" className="btn-secondary">⚡ Automations</Link>
        </div>
      </div>
    </div>
  );
}
