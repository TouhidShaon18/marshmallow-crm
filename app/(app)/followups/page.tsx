import Link from "next/link";
import { prisma } from "@/lib/db";
import WhatsAppButton from "@/components/whatsapp-button";

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

export default async function FollowUpsPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const customers = await prisma.customer.findMany({
    where: {
      OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: sevenDaysAgo } }],
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: [{ lastContactedAt: "asc" }], // nulls (never contacted) first in SQLite
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Follow-ups due</h1>
        <p className="text-sm text-brand-700/70">
          Customers not contacted in the last 7 days. {customers.length} need attention.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="card p-10 text-center text-brand-700/60">
          🎉 You&apos;re all caught up! No follow-ups due.
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const since = daysSince(c.lastContactedAt);
            return (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-sm text-brand-700/60">
                    {c.favouriteAnime ? `Loves ${c.favouriteAnime} · ` : ""}
                    {c.assignedTo?.name ? `Assigned to ${c.assignedTo.name}` : "Unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge bg-red-100 text-red-700">
                    {since == null ? "Never contacted" : `${since} days ago`}
                  </span>
                  <WhatsAppButton number={c.whatsappNumber} name={c.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
