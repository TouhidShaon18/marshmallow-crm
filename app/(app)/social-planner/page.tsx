import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole, isSalesRole } from "@/lib/auth";
import {
  currentPeriod, periodToLabel, prevPeriod, nextPeriod,
} from "@/lib/social";
import type { SocialChannelKey } from "@/lib/social";
import ChannelTabs from "@/components/channel-tabs";
import GenerateMonthButton from "@/components/generate-month-button";
import AddSocialPostForm from "@/components/add-social-post-form";

export default async function SocialPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Sales-only users shouldn't be here (middleware handles it, but belt-and-suspenders)
  if (isSalesRole(user.role) && !isOwnerRole(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const period = params.month ?? currentPeriod();
  const label  = periodToLabel(period);
  const prev   = prevPeriod(period);
  const next   = nextPeriod(period);

  // Marketing employees can VIEW and log posts — only owner can create/delete/generate
  const isManagerView = isOwnerRole(user.role); // kept for template/generate controls
  const canView = isOwnerRole(user.role) || isMarketingRole(user.role);

  // Fetch posts for this period
  const postsRaw = await prisma.socialPost.findMany({
    where: {
      period,
      // Employee-only: see just their posts
      ...(isManagerView ? {} : { assignedToId: user.id }),
    },
    orderBy: [{ scheduledDate: "asc" }, { channel: "asc" }],
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  // Fetch marketing employees for forms
  const employees = isManagerView
    ? await prisma.user.findMany({
        where: { role: { in: ["MARKETING", "SALES"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const activeTemplateCount = isManagerView
    ? await prisma.socialTemplate.count({ where: { active: true } })
    : 0;

  // Stats
  const total    = postsRaw.length;
  const planned  = postsRaw.filter((p) => p.status === "PLANNED").length;
  const posted   = postsRaw.filter((p) => p.status === "POSTED").length;
  const done     = postsRaw.filter((p) => p.status === "METRICS_LOGGED").length;
  const overdue  = postsRaw.filter((p) => {
    const now = new Date();
    const days = p.postedAt ? (now.getTime() - new Date(p.postedAt).getTime()) / 86_400_000 : null;
    return p.status === "POSTED" && days !== null && days >= 3;
  }).length;

  // Default date for one-off form (first of the month)
  const [y, m] = period.split("-");
  const defaultDate = `${y}-${m}-01`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Social Planner</h1>
          <p className="text-sm text-brand-700/70">Monthly content calendar for all channels.</p>
        </div>
        {isManagerView && (
          <Link href="/social-planner/templates" className="btn-secondary text-sm">
            ⚙️ Manage templates
          </Link>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Link href={`/social-planner?month=${prev}`} className="btn-ghost text-sm">← Prev</Link>
        <h2 className="text-lg font-semibold text-brand-900 min-w-[160px] text-center">{label}</h2>
        <Link href={`/social-planner?month=${next}`} className="btn-ghost text-sm">Next →</Link>
      </div>

      {/* Stat bar */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">{total}</p>
            <p className="text-xs text-brand-700/60">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">{planned}</p>
            <p className="text-xs text-brand-700/60">Planned</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-sky-600">{posted}</p>
            <p className="text-xs text-brand-700/60">Posted</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{done}</p>
            <p className="text-xs text-brand-700/60">Metrics done</p>
          </div>
        </div>
      )}

      {/* Overdue metrics alert */}
      {overdue > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ <strong>{overdue} post{overdue > 1 ? "s" : ""}</strong> have been live for 3+ days — time to log performance metrics!
        </div>
      )}

      {/* No posts yet — generate CTA */}
      {total === 0 && isManagerView && (
        <div className="rounded-xl border-2 border-dashed border-brand-200 px-6 py-10 text-center space-y-4">
          <p className="text-brand-700/60">No posts planned for {label} yet.</p>
          {activeTemplateCount > 0 ? (
            <>
              <p className="text-sm text-brand-700/50">
                You have {activeTemplateCount} active template{activeTemplateCount > 1 ? "s" : ""} ready.
              </p>
              <GenerateMonthButton period={period} label={label} />
            </>
          ) : (
            <p className="text-sm text-brand-700/50">
              <Link href="/social-planner/templates" className="text-brand-600 hover:underline">
                Set up recurring templates
              </Link>{" "}
              first, then generate the month in one click.
            </p>
          )}
        </div>
      )}

      {total === 0 && !isManagerView && (
        <p className="rounded-xl border border-dashed border-brand-200 px-6 py-10 text-center text-sm text-brand-700/50">
          No posts assigned to you for {label}.
        </p>
      )}

      {/* Posts — filter by channel */}
      {total > 0 && (
        <ChannelTabs
          posts={postsRaw.map((p) => ({
            ...p,
            channel: p.channel as SocialChannelKey,
            status: p.status as "PLANNED" | "POSTED" | "METRICS_LOGGED",
          }))}
          canDelete={isManagerView}
        />
      )}

      {/* Manager actions — generate + one-off post */}
      {isManagerView && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-brand-100">
          {activeTemplateCount > 0 && (
            <GenerateMonthButton period={period} label={label} />
          )}
          <AddSocialPostForm employees={employees} defaultDate={defaultDate} />
        </div>
      )}
    </div>
  );
}
