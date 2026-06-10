import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole } from "@/lib/auth";
import { deleteTemplate, toggleTemplate } from "@/app/social-actions";
import { CHANNEL_CONFIG } from "@/lib/social";
import type { SocialChannelKey } from "@/lib/social";
import CreateTemplateForm from "@/components/create-template-form";
import DeleteButton from "@/components/delete-button";
import Link from "next/link";

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role) && !isMarketingRole(user.role)) redirect("/social-planner");

  const [templates, employees] = await Promise.all([
    prisma.socialTemplate.findMany({
      orderBy: [{ channel: "asc" }, { dayOfMonth: "asc" }],
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ["MARKETING", "SALES"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const active   = templates.filter((t) => t.active);
  const inactive = templates.filter((t) => !t.active);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/social-planner" className="text-sm text-brand-600 hover:underline">
          ← Back to planner
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-900">Recurring Templates</h1>
        <p className="text-sm text-brand-700/70">
          Define your monthly content calendar once — it auto-generates every month.
        </p>
      </div>

      {/* Add template */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Add recurring post
        </h2>
        <CreateTemplateForm employees={employees} />
      </div>

      {/* Active templates */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
            Active templates ({active.length})
          </h2>
          {active.map((t) => {
            const cfg = CHANNEL_CONFIG[t.channel as SocialChannelKey];
            const del = deleteTemplate.bind(null, t.id);
            const pause = toggleTemplate.bind(null, t.id, false);
            return (
              <div key={t.id} className="card flex flex-wrap items-start gap-3 p-4">
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-900">{t.topic}</p>
                  <p className="text-xs text-brand-700/50">
                    Every month on the <strong>{t.dayOfMonth}{ordinal(t.dayOfMonth)}</strong>
                    {t.assignedTo && ` · ${t.assignedTo.name}`}
                  </p>
                  {t.notes && <p className="text-xs text-brand-700/40 italic">{t.notes}</p>}
                </div>
                <div className="flex gap-2 text-xs">
                  <form action={pause}>
                    <button type="submit" className="text-brand-500 hover:underline">Pause</button>
                  </form>
                  <DeleteButton
                    action={del}
                    label="Delete"
                    message={`Delete the "${t.topic}" template? Future months won't generate this post.`}
                    className="text-red-400 hover:text-red-600 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paused templates */}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/40">
            Paused ({inactive.length})
          </h2>
          {inactive.map((t) => {
            const cfg = CHANNEL_CONFIG[t.channel as SocialChannelKey];
            const resume = toggleTemplate.bind(null, t.id, true);
            const del = deleteTemplate.bind(null, t.id);
            return (
              <div key={t.id} className="card flex flex-wrap items-start gap-3 p-4 opacity-60">
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-900">{t.topic}</p>
                  <p className="text-xs text-brand-700/50">Day {t.dayOfMonth}{t.assignedTo && ` · ${t.assignedTo.name}`}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <form action={resume}>
                    <button type="submit" className="text-green-600 hover:underline">Resume</button>
                  </form>
                  <DeleteButton
                    action={del}
                    label="Delete"
                    message={`Delete the "${t.topic}" template?`}
                    className="text-red-400 hover:text-red-600 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {templates.length === 0 && (
        <p className="text-center text-sm text-brand-700/40 py-6">
          No templates yet. Add your first recurring post above.
        </p>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
