import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isMarketingRole, isOwnerRole } from "@/lib/auth";
import { deleteCampaign } from "@/app/campaign-actions";
import CreateCampaignForm from "@/components/create-campaign-form";
import DeleteButton from "@/components/delete-button";

const CHANNELS = [
  "Instagram", "TikTok", "Facebook", "SMS", "Email",
  "Flyer / Poster", "Referral Program", "Other",
];

function statusLabel(c: { startDate: Date | null; endDate: Date | null }) {
  const now = new Date();
  if (!c.startDate || c.startDate > now) return { label: "Upcoming", cls: "bg-amber-100 text-amber-700" };
  if (c.endDate && c.endDate < now)      return { label: "Ended",    cls: "bg-gray-100 text-gray-600" };
  return { label: "Active", cls: "bg-green-100 text-green-700" };
}

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isMarketingRole(user.role) && !isOwnerRole(user.role)) redirect("/dashboard");

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Campaigns</h1>
        <p className="text-sm text-brand-700/70">
          Track your marketing campaigns across all channels.
        </p>
      </div>

      {/* Create form */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          New campaign
        </h2>
        <CreateCampaignForm channels={CHANNELS} />
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <p className="text-center text-sm text-brand-700/50 py-8">
          No campaigns yet. Create your first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const { label, cls } = statusLabel(c);
            const del = deleteCampaign.bind(null, c.id);
            return (
              <div key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-brand-900">{c.name}</p>
                      <span className={`badge text-xs ${cls}`}>{label}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-brand-700/70">
                      {c.channel}
                      {c.budget && ` · ৳${c.budget.toLocaleString()} budget`}
                    </p>
                    {(c.startDate || c.endDate) && (
                      <p className="mt-0.5 text-xs text-brand-700/50">
                        {c.startDate
                          ? new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                        {" → "}
                        {c.endDate
                          ? new Date(c.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "ongoing"}
                      </p>
                    )}
                    {c.notes && <p className="mt-1 text-xs text-brand-700/60 italic">{c.notes}</p>}
                  </div>
                  <DeleteButton
                    action={del}
                    label="Delete"
                    message={`Delete the campaign "${c.name}"? This cannot be undone.`}
                    className="text-xs text-red-500 hover:underline"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
