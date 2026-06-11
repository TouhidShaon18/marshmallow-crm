import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole, normaliseRole } from "@/lib/auth";

const PLATFORM_ICON: Record<string, string> = {
  INSTAGRAM: "📸", TIKTOK: "🎵", YOUTUBE: "▶️",
  FACEBOOK: "👍", TWITTER: "🐦", BLOG: "✍️", OTHER: "🌐",
};

const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700",
  TIKTOK:    "bg-gray-100 text-gray-700",
  YOUTUBE:   "bg-red-100 text-red-700",
  FACEBOOK:  "bg-blue-100 text-blue-700",
  TWITTER:   "bg-sky-100 text-sky-700",
  BLOG:      "bg-amber-100 text-amber-700",
  OTHER:     "bg-brand-100 text-brand-700",
};

export default async function InfluencersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isMarketingRole(role)) redirect("/dashboard");

  const influencers = await prisma.influencer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      deals: {
        select: { amountPaid: true, interactions: true, reach: true, conversions: true },
      },
    },
  });

  const totals = influencers.reduce(
    (acc, inf) => {
      acc.spent       += inf.deals.reduce((s, d) => s + (d.amountPaid    ?? 0), 0);
      acc.interactions += inf.deals.reduce((s, d) => s + (d.interactions ?? 0), 0);
      acc.reach        += inf.deals.reduce((s, d) => s + (d.reach        ?? 0), 0);
      return acc;
    },
    { spent: 0, interactions: 0, reach: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Influencers</h1>
          <p className="text-sm text-brand-700/70">Track collaborations, payments, and performance.</p>
        </div>
        <Link href="/influencers/new" className="btn-primary">+ Add influencer</Link>
      </div>

      {/* Summary cards */}
      {influencers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">{influencers.length}</p>
            <p className="text-xs text-brand-700/60">Influencers</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">
              {influencers.reduce((s, i) => s + i.deals.length, 0)}
            </p>
            <p className="text-xs text-brand-700/60">Total deals</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">৳{totals.spent.toLocaleString()}</p>
            <p className="text-xs text-brand-700/60">Total spent</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">{totals.interactions.toLocaleString()}</p>
            <p className="text-xs text-brand-700/60">Total interactions</p>
          </div>
        </div>
      )}

      {/* Influencer list */}
      {influencers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-200 px-6 py-14 text-center space-y-3">
          <p className="text-4xl">🌟</p>
          <p className="text-brand-700/60">No influencers yet.</p>
          <Link href="/influencers/new" className="btn-primary inline-block">
            Add your first influencer
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {influencers.map((inf) => {
            const spent        = inf.deals.reduce((s, d) => s + (d.amountPaid    ?? 0), 0);
            const interactions = inf.deals.reduce((s, d) => s + (d.interactions ?? 0), 0);
            const reach        = inf.deals.reduce((s, d) => s + (d.reach        ?? 0), 0);

            return (
              <Link
                key={inf.id}
                href={`/influencers/${inf.id}`}
                className="card p-5 hover:shadow-md transition-shadow space-y-3 block"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-900 truncate">{inf.name}</p>
                    <p className="text-xs text-brand-700/60 truncate">{inf.socialHandle}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_COLOR[inf.platform]}`}>
                    {PLATFORM_ICON[inf.platform]} {inf.platform.charAt(0) + inf.platform.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Follower count + niche */}
                <div className="flex flex-wrap gap-2 text-xs text-brand-700/60">
                  {inf.followerCount != null && (
                    <span>👥 {formatFollowers(inf.followerCount)}</span>
                  )}
                  {inf.niche && <span>• {inf.niche}</span>}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-brand-50">
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-700">{inf.deals.length}</p>
                    <p className="text-[10px] text-brand-700/50">Deals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-700">৳{(spent/1000).toFixed(spent >= 1000 ? 1 : 0)}{spent >= 1000 ? "k" : ""}</p>
                    <p className="text-[10px] text-brand-700/50">Paid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-700">{formatNum(interactions)}</p>
                    <p className="text-[10px] text-brand-700/50">Interactions</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
