import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, canAccessMarketing, normaliseRole } from "@/lib/auth";
import { taka } from "@/lib/affiliate";

export default async function AffiliatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!canAccessMarketing(user.role, user.departments)) redirect("/dashboard");

  const [affiliates, tierCount] = await Promise.all([
    prisma.affiliate.findMany({
      orderBy: { createdAt: "desc" },
      include: { sales: { select: { orderAmount: true, commission: true, paid: true } } },
    }),
    prisma.commissionTier.count(),
  ]);

  const rows = affiliates.map((a) => {
    const salesTotal = a.sales.reduce((t, s) => t + s.orderAmount, 0);
    const earned = a.sales.reduce((t, s) => t + s.commission, 0);
    const owed = a.sales.filter((s) => !s.paid).reduce((t, s) => t + s.commission, 0);
    return { ...a, count: a.sales.length, salesTotal, earned, owed };
  });

  const totals = rows.reduce(
    (t, r) => ({ sales: t.sales + r.salesTotal, earned: t.earned + r.earned, owed: t.owed + r.owed }),
    { sales: 0, earned: 0, owed: 0 },
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Affiliate Marketing</h1>
          <p className="text-sm text-brand-500">Creator coupons &amp; commission tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwnerRole(role) && <Link href="/affiliates/dashboard" className="btn-secondary text-sm">📊 Performance</Link>}
          <Link href="/affiliates/sales/new" className="btn-secondary text-sm">+ Record sale</Link>
          <Link href="/affiliates/sales/import" className="btn-secondary text-sm">⬆ Import sales</Link>
          {isOwnerRole(role) && <Link href="/affiliates/tiers" className="btn-secondary text-sm">⚙ Commission tiers</Link>}
          <Link href="/affiliates/new" className="btn-primary text-sm">+ Add creator</Link>
        </div>
      </div>

      {tierCount === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Set up commission tiers first.</p>
          <p className="mt-1">Define the price brackets and their commission % before recording sales.{" "}
            {isOwnerRole(role)
              ? <Link href="/affiliates/tiers" className="font-semibold underline">Set up tiers →</Link>
              : "Ask the owner to configure them."}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Creators", value: String(rows.length) },
          { label: "Attributed sales", value: taka(totals.sales) },
          { label: "Commission earned", value: taka(totals.earned) },
          { label: "Owed (unpaid)", value: taka(totals.owed), accent: true },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="text-xs text-brand-500">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${c.accent ? "text-amber-600" : "text-brand-900"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Creator table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-10 text-center">
          <p className="text-brand-500 mb-3">No creators yet. Add your first affiliate to get started.</p>
          <Link href="/affiliates/new" className="btn-primary">+ Add creator</Link>
        </div>
      ) : (
        <div className="rounded-xl border border-brand-100 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Creator</th>
                <th className="px-4 py-2 text-left">Coupon</th>
                <th className="px-4 py-2 text-right">Sales</th>
                <th className="px-4 py-2 text-right">Attributed</th>
                <th className="px-4 py-2 text-right">Earned</th>
                <th className="px-4 py-2 text-right">Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-2">
                    <Link href={`/affiliates/${r.id}`} className="font-medium text-brand-800 hover:text-brand-600">
                      {r.name}
                    </Link>
                    {!r.active && <span className="ml-2 badge bg-gray-100 text-gray-500">inactive</span>}
                    {r.platform && <span className="block text-xs text-brand-400">{r.platform}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className="badge bg-brand-100 text-brand-700 font-mono">{r.couponCode}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-brand-600">{r.count}</td>
                  <td className="px-4 py-2 text-right text-brand-700">{taka(r.salesTotal)}</td>
                  <td className="px-4 py-2 text-right font-medium text-brand-800">{taka(r.earned)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${r.owed > 0 ? "text-amber-600" : "text-brand-400"}`}>{taka(r.owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
