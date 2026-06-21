import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isMarketingRole, isOwnerRole, normaliseRole } from "@/lib/auth";
import { currentPeriod, periodToLabel, CHANNEL_CONFIG, ALL_CHANNELS } from "@/lib/social";
import type { SocialChannelKey } from "@/lib/social";
import { getMarketingProgress } from "@/app/target-actions";
import { MarketingTargetCard } from "@/components/target-progress";
import MarketingCharts from "@/components/marketing-charts";

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

  // ── Marketing employee: personal KPI dashboard ────────────────────────────
  if (isMarketingRole(user.role) && !isOwnerRole(user.role)) {
    const period = currentPeriod();
    const label  = periodToLabel(period);
    const [year, month] = period.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month,     1);

    const [posts, target] = await Promise.all([
      prisma.socialPost.findMany({
        where: { assignedToId: user.id, period },
        orderBy: { scheduledDate: "asc" },
        select: {
          id: true, channel: true, topic: true, status: true,
          viewCount: true, reactCount: true, commentCount: true, shareCount: true,
          postedAt: true, postUrl: true, scheduledDate: true,
        },
      }),
      prisma.employeeTarget.findFirst({
        where: { userId: user.id, period },
      }),
    ]);

    const actual = await getMarketingProgress(user.id, period);

    // Posts needing metrics (status POSTED and 3+ days since postedAt)
    const now = new Date();
    const needsMetrics = posts.filter((p) => {
      if (p.status !== "POSTED" || !p.postedAt) return false;
      const days = (now.getTime() - new Date(p.postedAt).getTime()) / 86_400_000;
      return days >= 3;
    });

    // Group by channel
    const byChannel = new Map<SocialChannelKey, typeof posts>();
    for (const p of posts) {
      const ch = p.channel as SocialChannelKey;
      if (!byChannel.has(ch)) byChannel.set(ch, []);
      byChannel.get(ch)!.push(p);
    }

    const statusColor = (s: string) =>
      s === "METRICS_LOGGED" ? "bg-green-100 text-green-700"
      : s === "POSTED"       ? "bg-sky-100 text-sky-700"
      : "bg-brand-100 text-brand-700";

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-brand-900">My Marketing Dashboard</h1>
          <p className="text-sm text-brand-700/70">{label} · your content performance at a glance.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Posts done",  value: actual.posts },
            { label: "Total views",  value: actual.views.toLocaleString() },
            { label: "Reactions",    value: actual.reacts.toLocaleString() },
            { label: "Comments",     value: actual.comments.toLocaleString() },
            { label: "Shares",       value: actual.shares.toLocaleString() },
          ].map((k) => (
            <div key={k.label} className="card p-4 text-center">
              <p className="text-2xl font-bold text-brand-700">{k.value}</p>
              <p className="text-xs text-brand-700/60">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Target progress */}
        {target && (
          <MarketingTargetCard
            name={`${user.name}'s targets`}
            target={target}
            actual={actual}
          />
        )}
        {!target && (
          <div className="rounded-lg border border-dashed border-pink-200 px-4 py-3 text-sm text-pink-700/50">
            No targets set yet — ask your manager to assign monthly targets.
          </div>
        )}

        {/* Needs metrics alert */}
        {needsMetrics.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ <strong>{needsMetrics.length} post{needsMetrics.length > 1 ? "s" : ""}</strong> need metrics — they've been live 3+ days.{" "}
            <Link href="/social-planner" className="underline">Log now →</Link>
          </div>
        )}

        {/* Posts by channel */}
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-brand-900">Posts this month</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-brand-700/50">No posts assigned to you for {label}.</p>
          ) : (
            <div className="space-y-5">
              {ALL_CHANNELS.filter((ch) => byChannel.has(ch)).map((ch) => {
                const cfg = CHANNEL_CONFIG[ch];
                const chPosts = byChannel.get(ch)!;
                return (
                  <div key={ch}>
                    <h3 className={`mb-2 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                      <span className="ml-1 opacity-60">({chPosts.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {chPosts.map((p) => (
                        <div key={p.id} className="card flex flex-wrap items-start gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-900">{p.topic}</p>
                            <p className="text-xs text-brand-700/50">
                              Scheduled{" "}
                              {new Date(p.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              {p.postUrl && (
                                <>
                                  {" · "}
                                  <a href={p.postUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                                    View post ↗
                                  </a>
                                </>
                              )}
                            </p>
                            {p.status === "METRICS_LOGGED" && (
                              <p className="text-xs text-brand-700/40">
                                👁️ {p.viewCount ?? 0}  ❤️ {p.reactCount ?? 0}  💬 {p.commentCount ?? 0}  🔁 {p.shareCount ?? 0}
                              </p>
                            )}
                          </div>
                          <span className={`badge text-xs ${statusColor(p.status)}`}>
                            {p.status.replace("_", " ").toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Link to social planner for actions */}
        <div className="pt-2 border-t border-brand-100">
          <Link href="/social-planner" className="btn-secondary text-sm">
            📅 Open full social planner
          </Link>
        </div>
      </div>
    );
  }

  // ── Owner: Marketing Hub ───────────────────────────────────────────────────

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ownerPeriod = currentPeriod();
  const ownerPeriodLabel = periodToLabel(ownerPeriod);

  const [
    totalCustomers,
    newThisMonth,
    leadSources,
    recentBroadcasts,
    campaigns,
    activeCampaigns,
    marketingEmployees,
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
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        startDate: { lte: now },
      },
    }),
    prisma.user.findMany({
      where: { role: "MARKETING" },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        targets: { where: { period: ownerPeriod }, take: 1 },
      },
    }),
  ]);

  // Fetch social posts for all marketing employees this month (one query)
  const allMktPosts = await prisma.socialPost.findMany({
    where: {
      period: ownerPeriod,
      assignedToId: { in: marketingEmployees.map((e) => e.id) },
    },
    select: {
      assignedToId: true, channel: true, status: true,
      viewCount: true, reactCount: true, commentCount: true, shareCount: true,
    },
  });

  // Build per-employee stats
  type MktStats = { posts: number; views: number; reacts: number; comments: number; shares: number; byChannel: Record<string, number> };
  const mktStats: Record<string, MktStats> = {};
  for (const e of marketingEmployees) {
    mktStats[e.id] = { posts: 0, views: 0, reacts: 0, comments: 0, shares: 0, byChannel: {} };
  }
  for (const p of allMktPosts) {
    if (!p.assignedToId) continue;
    const s = mktStats[p.assignedToId];
    if (!s) continue;
    if (p.status === "POSTED" || p.status === "METRICS_LOGGED") {
      s.posts++;
      s.views    += p.viewCount    ?? 0;
      s.reacts   += p.reactCount   ?? 0;
      s.comments += p.commentCount ?? 0;
      s.shares   += p.shareCount   ?? 0;
    }
    s.byChannel[p.channel] = (s.byChannel[p.channel] ?? 0) + 1;
  }

  // Overall channel totals
  const channelTotals: Record<string, number> = {};
  for (const p of allMktPosts) {
    channelTotals[p.channel] = (channelTotals[p.channel] ?? 0) + 1;
  }

  const knownLeadSources = leadSources.filter((r) => r.leadSource);
  const unknownCount = leadSources.find((r) => !r.leadSource)?._count._all ?? 0;
  const totalWithSource = knownLeadSources.reduce((s, r) => s + r._count._all, 0);

  // ── Analytics chart data ────────────────────────────────────────────────────
  const monthsBack = 6;
  const trendStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const [leadsForTrend, postsByChannelRaw, spendRaw] = await Promise.all([
    prisma.customer.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true } }),
    prisma.socialPost.groupBy({ by: ["channel"], where: { period: ownerPeriod }, _count: { _all: true } }),
    prisma.campaign.groupBy({ by: ["channel"], _sum: { budget: true } }),
  ]);

  const trendBuckets: { key: string; label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendBuckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", { month: "short" }) + " '" + String(d.getFullYear()).slice(2),
      value: 0,
    });
  }
  const bucketMap = new Map(trendBuckets.map((b) => [b.key, b]));
  for (const c of leadsForTrend) {
    const d = new Date(c.createdAt);
    const b = bucketMap.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    if (b) b.value++;
  }
  const newLeadsChart = trendBuckets.map((b) => ({ label: b.label, value: b.value }));

  const postsByChannelChart = ALL_CHANNELS
    .map((ch) => ({ label: CHANNEL_CONFIG[ch].label, value: postsByChannelRaw.find((r) => r.channel === ch)?._count._all ?? 0 }))
    .filter((d) => d.value > 0);

  const leadsBySourceChart = knownLeadSources.map((r) => ({ label: r.leadSource!, value: r._count._all }));

  const spendByChannelChart = spendRaw
    .map((r) => ({ label: r.channel, value: r._sum.budget ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

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

      {/* Analytics charts */}
      <MarketingCharts
        newLeads={newLeadsChart}
        postsByChannel={postsByChannelChart}
        leadsBySource={leadsBySourceChart}
        spendByChannel={spendByChannelChart}
        monthLabel={ownerPeriodLabel}
      />

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
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {unknownCount > 0 && (
                <p className="text-xs text-brand-700/40">+ {unknownCount} without a source tracked</p>
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
              <Link href="/broadcasts" className="text-brand-600 hover:underline">Create one</Link>
            </p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {recentBroadcasts.map((b) => (
                <li key={b.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/broadcasts/${b.id}`} className="text-sm font-medium text-brand-900 hover:underline">
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
                    <span className={`badge text-xs ${
                      b.status === "SENT" ? "bg-green-100 text-green-700"
                      : b.status === "SCHEDULED" ? "bg-amber-100 text-amber-700"
                      : "bg-brand-100 text-brand-700"
                    }`}>
                      {b.status.toLowerCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Marketing team performance */}
      {marketingEmployees.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-900">📣 Marketing Team — {ownerPeriodLabel}</h2>
              <p className="text-sm text-brand-700/70">Content posted, metrics, and target progress.</p>
            </div>
            <Link href="/social-planner" className="text-sm text-brand-600 hover:underline">
              Open planner →
            </Link>
          </div>

          {/* Channel totals bar */}
          {Object.keys(channelTotals).length > 0 && (
            <div className="card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700/60">Posts by channel this month</p>
              <div className="flex flex-wrap gap-2">
                {ALL_CHANNELS.filter((ch) => channelTotals[ch]).map((ch) => {
                  const cfg = CHANNEL_CONFIG[ch];
                  return (
                    <span key={ch} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                      <span className="ml-1 rounded-full bg-white/60 px-1.5 py-0.5 font-bold">{channelTotals[ch]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-employee KPI + target cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {marketingEmployees.map((e) => {
              const s = mktStats[e.id] ?? { posts: 0, views: 0, reacts: 0, comments: 0, shares: 0 };
              const tgt = e.targets[0] ?? null;
              return (
                <div key={e.id} className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-brand-900">{e.name}</p>
                    <Link href="/team" className="text-xs text-brand-500 hover:underline">Set target →</Link>
                  </div>

                  {/* Quick stats row */}
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      { icon: "📅", val: s.posts,    tip: "Posts" },
                      { icon: "👁️", val: s.views,    tip: "Views" },
                      { icon: "❤️",  val: s.reacts,   tip: "Reacts" },
                      { icon: "💬", val: s.comments, tip: "Comments" },
                      { icon: "🔁", val: s.shares,   tip: "Shares" },
                    ].map((k) => (
                      <div key={k.tip} className="rounded-lg bg-brand-50 px-1 py-2">
                        <p className="text-sm">{k.icon}</p>
                        <p className="text-sm font-bold text-brand-700">{k.val.toLocaleString()}</p>
                        <p className="text-[10px] text-brand-700/50">{k.tip}</p>
                      </div>
                    ))}
                  </div>

                  <MarketingTargetCard
                    name={e.name}
                    target={tgt ?? { postsTarget: null, viewsTarget: null, reactsTarget: null, commentsTarget: null, sharesTarget: null }}
                    actual={s}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/broadcasts" className="btn-primary">📣 New broadcast</Link>
          <Link href="/campaigns" className="btn-secondary">🚀 View campaigns</Link>
          <Link href="/social-planner" className="btn-secondary">📅 Social planner</Link>
          <Link href="/automations" className="btn-secondary">⚡ Automations</Link>
        </div>
      </div>
    </div>
  );
}
