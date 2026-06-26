import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canAccessMarketing } from "@/lib/auth";
import { deleteInfluencer, deleteDeal } from "@/app/influencer-actions";
import AddDealForm from "@/components/add-deal-form";
import EditInfluencerForm from "@/components/edit-influencer-form";
import DeleteButton from "@/components/delete-button";

const PLATFORM_ICON: Record<string, string> = {
  INSTAGRAM: "📸", TIKTOK: "🎵", YOUTUBE: "▶️",
  FACEBOOK: "👍", TWITTER: "🐦", BLOG: "✍️", OTHER: "🌐",
};
const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700", TIKTOK: "bg-gray-100 text-gray-700",
  YOUTUBE: "bg-red-100 text-red-700",     FACEBOOK: "bg-blue-100 text-blue-700",
  TWITTER: "bg-sky-100 text-sky-700",     BLOG: "bg-amber-100 text-amber-700",
  OTHER: "bg-brand-100 text-brand-700",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default async function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessMarketing(user.role, user.departments)) redirect("/dashboard");

  const { id } = await params;

  const [influencer, campaigns] = await Promise.all([
    prisma.influencer.findUnique({
      where: { id },
      include: {
        deals: {
          orderBy: { createdAt: "desc" },
          include: { campaign: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!influencer) notFound();

  const totalSpent       = influencer.deals.reduce((s, d) => s + (d.amountPaid    ?? 0), 0);
  const totalInteractions = influencer.deals.reduce((s, d) => s + (d.interactions ?? 0), 0);
  const totalReach       = influencer.deals.reduce((s, d) => s + (d.reach        ?? 0), 0);
  const totalConversions = influencer.deals.reduce((s, d) => s + (d.conversions  ?? 0), 0);
  const costPerInteraction = totalInteractions > 0 ? totalSpent / totalInteractions : null;

  const delInfluencer = deleteInfluencer.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Back */}
      <Link href="/influencers" className="text-sm text-brand-600 hover:underline">
        ← Back to influencers
      </Link>

      {/* Profile card */}
      <div className="card p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{influencer.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_COLOR[influencer.platform]}`}>
                {PLATFORM_ICON[influencer.platform]}{" "}
                {influencer.platform.charAt(0) + influencer.platform.slice(1).toLowerCase()}
              </span>
            </div>
            <p className="text-brand-700/70">{influencer.socialHandle}</p>
            {influencer.niche && (
              <p className="text-sm text-brand-700/50">🏷️ {influencer.niche}</p>
            )}
          </div>
          <DeleteButton
            action={delInfluencer}
            label="Delete influencer"
            message={`Delete ${influencer.name} and all their deal history? This cannot be undone.`}
            className="text-sm text-red-500 hover:underline"
          />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          {influencer.followerCount != null && (
            <div className="rounded-lg bg-brand-50 p-3 text-center">
              <p className="text-lg font-bold text-brand-700">{fmt(influencer.followerCount)}</p>
              <p className="text-xs text-brand-700/50">Followers</p>
            </div>
          )}
          {influencer.email && (
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-700/50 mb-0.5">Email</p>
              <p className="text-brand-900 text-xs truncate">{influencer.email}</p>
            </div>
          )}
          {influencer.phone && (
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-700/50 mb-0.5">Phone</p>
              <p className="text-brand-900 text-xs">{influencer.phone}</p>
            </div>
          )}
          {influencer.notes && (
            <div className="col-span-2 rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-700/50 mb-0.5">Notes</p>
              <p className="text-brand-900 text-xs">{influencer.notes}</p>
            </div>
          )}
        </div>

        {/* Edit form */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-brand-600 hover:underline list-none">
            ✏️ Edit profile
          </summary>
          <div className="mt-3 rounded-lg border border-brand-100 p-4">
            <EditInfluencerForm influencer={influencer} />
          </div>
        </details>
      </div>

      {/* Lifetime stats */}
      {influencer.deals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Deals",         value: influencer.deals.length.toString() },
            { label: "Total paid",    value: `৳${totalSpent.toLocaleString()}` },
            { label: "Total reach",   value: fmt(totalReach) },
            { label: "Interactions",  value: fmt(totalInteractions) },
            { label: "Conversions",   value: fmt(totalConversions) },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-xl font-bold text-brand-700">{s.value}</p>
              <p className="text-[11px] text-brand-700/50">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {costPerInteraction != null && (
        <p className="text-xs text-brand-700/50 -mt-3">
          Cost per interaction: ৳{costPerInteraction.toFixed(2)}
        </p>
      )}

      {/* Deal history */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-brand-900">Deal history</h2>

        {influencer.deals.length === 0 ? (
          <p className="text-sm text-brand-700/50">No deals yet — log one below.</p>
        ) : (
          <div className="space-y-3">
            {influencer.deals.map((deal) => {
              const delDeal = deleteDeal.bind(null, deal.id, influencer.id);
              return (
                <div key={deal.id} className="card p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-900">{deal.title}</p>
                      {deal.campaign && (
                        <p className="text-xs text-brand-700/50">
                          Campaign: {deal.campaign.name}
                        </p>
                      )}
                      {(deal.startDate || deal.endDate) && (
                        <p className="text-xs text-brand-700/50">
                          {deal.startDate
                            ? new Date(deal.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : ""}
                          {deal.endDate
                            ? ` → ${new Date(deal.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <DeleteButton
                      action={delDeal}
                      label="Delete"
                      message={`Delete the "${deal.title}" deal?`}
                      className="text-xs text-red-400 hover:text-red-600"
                    />
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-xs">
                    {[
                      { icon: "💰", label: "Paid",         value: deal.amountPaid    != null ? `৳${deal.amountPaid.toLocaleString()}` : "—" },
                      { icon: "👁️", label: "Reach",        value: deal.reach         != null ? fmt(deal.reach)         : "—" },
                      { icon: "❤️",  label: "Interactions", value: deal.interactions  != null ? fmt(deal.interactions)  : "—" },
                      { icon: "🔗", label: "Clicks",       value: deal.clicks        != null ? fmt(deal.clicks)        : "—" },
                      { icon: "✅", label: "Conversions",  value: deal.conversions   != null ? fmt(deal.conversions)   : "—" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-brand-50 px-2 py-2">
                        <p className="text-sm">{m.icon}</p>
                        <p className="font-semibold text-brand-900">{m.value}</p>
                        <p className="text-brand-700/50">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {deal.postUrl && (
                    <a
                      href={deal.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      🔗 View post ↗
                    </a>
                  )}
                  {deal.notes && (
                    <p className="text-xs text-brand-700/50 italic">{deal.notes}</p>
                  )}
                  {deal.paymentNotes && (
                    <p className="text-xs text-brand-700/40">💳 {deal.paymentNotes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add deal form */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-brand-900">Log a new deal</h2>
        <AddDealForm influencerId={influencer.id} campaigns={campaigns} />
      </div>
    </div>
  );
}
