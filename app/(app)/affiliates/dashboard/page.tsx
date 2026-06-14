import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, normaliseRole } from "@/lib/auth";
import { taka } from "@/lib/affiliate";

type Range = "month" | "3m" | "all";
type SortBy = "commission" | "revenue" | "sales" | "owed";

const RANGES: { value: Range; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3m",    label: "Last 3 months" },
  { value: "all",   label: "All time" },
];
const SORTS: { value: SortBy; label: string }[] = [
  { value: "commission", label: "Commission" },
  { value: "revenue",    label: "Sales value" },
  { value: "sales",      label: "Orders" },
  { value: "owed",       label: "Owed" },
];

function monthLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} '${y.slice(2)}`;
}

function rangeCutoff(range: Range): Date | null {
  const now = new Date();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "3m")    return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return null;
}

export default async function AffiliateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; by?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(normaliseRole(user.role))) redirect("/affiliates");

  const params = await searchParams;
  const range: Range = (["month", "3m", "all"].includes(params.range ?? "") ? params.range : "month") as Range;
  const by: SortBy = (["commission", "revenue", "sales", "owed"].includes(params.by ?? "") ? params.by : "commission") as SortBy;
  const cutoff = rangeCutoff(range);

  const affiliates = await prisma.affiliate.findMany({
    include: { sales: true },
  });

  // Filter sales to range
  const inRange = (d: Date) => (cutoff ? new Date(d) >= cutoff : true);

  let totalRevenue = 0, totalCommission = 0, totalOwed = 0, totalPaid = 0, totalOrders = 0, activeCreators = 0;
  const monthly: Record<string, { revenue: number; commission: number }> = {};
  const byTier: Record<string, { commission: number; orders: number }> = {};

  const leaderboard = affiliates.map((a) => {
    const sales = a.sales.filter((s) => inRange(s.soldAt));
    const revenue = sales.reduce((t, s) => t + s.orderAmount, 0);
    const commission = sales.reduce((t, s) => t + s.commission, 0);
    const owed = sales.filter((s) => !s.paid).reduce((t, s) => t + s.commission, 0);
    const paid = commission - owed;

    totalRevenue += revenue;
    totalCommission += commission;
    totalOwed += owed;
    totalPaid += paid;
    totalOrders += sales.length;
    if (sales.length > 0) activeCreators++;

    for (const s of sales) {
      const period = new Date(s.soldAt).toISOString().slice(0, 7);
      (monthly[period] ??= { revenue: 0, commission: 0 }).revenue += s.orderAmount;
      monthly[period].commission += s.commission;
      (byTier[s.tierLabel] ??= { commission: 0, orders: 0 }).commission += s.commission;
      byTier[s.tierLabel].orders += 1;
    }

    return { id: a.id, name: a.name, couponCode: a.couponCode, platform: a.platform, active: a.active,
      orders: sales.length, revenue, commission, owed };
  });

  // Sort leaderboard
  leaderboard.sort((x, y) =>
    by === "sales" ? y.orders - x.orders
    : by === "revenue" ? y.revenue - x.revenue
    : by === "owed" ? y.owed - x.owed
    : y.commission - x.commission,
  );

  const avgRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

  // Monthly trend buckets (last 6 with data, chronological)
  const months = Object.keys(monthly).sort().slice(-6);
  const maxMonthlyCommission = Math.max(...months.map((m) => monthly[m].commission), 1);

  // Tier distribution (sorted by commission desc)
  const tierRows = Object.entries(byTier).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.commission - a.commission);
  const maxTierCommission = Math.max(...tierRows.map((t) => t.commission), 1);

  const maxLbCommission = Math.max(...leaderboard.map((l) => l.commission), 1);
  const topPerformer = [...leaderboard].sort((a, b) => b.commission - a.commission)[0];

  const hasData = totalOrders > 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
          <h1 className="text-xl font-bold text-brand-900">Affiliate Performance</h1>
        </div>
        {/* Range tabs */}
        <div className="inline-flex rounded-lg border border-brand-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link key={r.value} href={`/affiliates/dashboard?range=${r.value}&by=${by}`}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${range === r.value ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-50"}`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Attributed revenue", value: taka(totalRevenue) },
          { label: "Commission", value: taka(totalCommission) },
          { label: "Owed", value: taka(totalOwed), accent: totalOwed > 0 },
          { label: "Paid out", value: taka(totalPaid) },
          { label: "Orders", value: String(totalOrders) },
          { label: "Avg. rate", value: `${avgRate.toFixed(1)}%` },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-[11px] text-brand-500">{c.label}</p>
            <p className={`mt-1 text-lg font-bold ${c.accent ? "text-amber-600" : "text-brand-900"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-10 text-center text-sm text-brand-500">
          No affiliate sales in this period. Try a wider range, or{" "}
          <Link href="/affiliates/sales/new" className="font-semibold underline">record a sale</Link>.
        </div>
      ) : (
        <>
          {/* Top performer highlight */}
          {topPerformer && topPerformer.commission > 0 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <p className="text-sm text-brand-800">
                Top performer: <Link href={`/affiliates/${topPerformer.id}`} className="font-bold hover:underline">{topPerformer.name}</Link>
                {" "}drove <span className="font-semibold">{taka(topPerformer.revenue)}</span> in sales for{" "}
                <span className="font-semibold">{taka(topPerformer.commission)}</span> commission.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly trend */}
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-1">Commission by month</p>
              <div className="flex items-end gap-2 pt-4 pb-2" style={{ height: 180 }}>
                {months.map((m) => {
                  const h = Math.max(2, (monthly[m].commission / maxMonthlyCommission) * 130);
                  return (
                    <div key={m} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-brand-600">{taka(monthly[m].commission)}</span>
                      <div className="w-full rounded-t bg-brand-500" style={{ height: h }} />
                      <span className="text-[9px] text-brand-400">{monthLabel(m)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Commission by bracket */}
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-3">Commission by bracket</p>
              <ul className="space-y-2">
                {tierRows.map((t) => {
                  const pct = (t.commission / maxTierCommission) * 100;
                  return (
                    <li key={t.label} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-brand-700">{t.label} <span className="text-brand-400">· {t.orders} order{t.orders === 1 ? "" : "s"}</span></span>
                        <span className="text-brand-600 font-medium">{taka(t.commission)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-brand-50">
                        <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="rounded-xl border border-brand-100 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <h2 className="text-sm font-semibold text-brand-700">Creator leaderboard</h2>
              <div className="inline-flex rounded-lg border border-brand-200 p-0.5 text-xs">
                {SORTS.map((sopt) => (
                  <Link key={sopt.value} href={`/affiliates/dashboard?range=${range}&by=${sopt.value}`}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${by === sopt.value ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50"}`}>
                    {sopt.label}
                  </Link>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Creator</th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Sales value</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Owed</th>
                  <th className="px-4 py-2 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {leaderboard.map((l, i) => (
                  <tr key={l.id} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-2 text-brand-400">{i + 1}</td>
                    <td className="px-4 py-2">
                      <Link href={`/affiliates/${l.id}`} className="font-medium text-brand-800 hover:text-brand-600">{l.name}</Link>
                      <span className="ml-2 badge bg-brand-100 text-brand-700 font-mono text-[10px]">{l.couponCode}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-brand-600">{l.orders}</td>
                    <td className="px-4 py-2 text-right text-brand-700">{taka(l.revenue)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-brand-800">{taka(l.commission)}</td>
                    <td className={`px-4 py-2 text-right ${l.owed > 0 ? "text-amber-600" : "text-brand-400"}`}>{taka(l.owed)}</td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 rounded-full bg-brand-50">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(l.commission / maxLbCommission) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
