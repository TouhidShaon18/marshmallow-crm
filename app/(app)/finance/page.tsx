import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isFinanceRole, normaliseRole } from "@/lib/auth";
import { calcFinance } from "@/lib/finance";
import { getFinanceInsight } from "@/lib/ai";

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 100000 ? `৳${(abs / 1000).toFixed(0)}k` : `৳${abs.toLocaleString("en-BD")}`;
  return n < 0 ? `-${s}` : s;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <p className="text-xs text-brand-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color ?? "text-brand-900"}`}>{value}</p>
      {sub && <p className="text-xs text-brand-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({
  bars,
  height = 120,
}: {
  bars: { label: string; value: number; max: number }[];
  height?: number;
}) {
  return (
    <div className="flex items-end gap-2 pt-4 pb-6 relative" style={{ height: height + 40 }}>
      {bars.map((b) => {
        const pct = b.max > 0 ? Math.max(2, Math.abs(b.value) / b.max) : 0.02;
        const barH = pct * height;
        const isNeg = b.value < 0;
        return (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <span className={`text-[10px] font-medium ${isNeg ? "text-red-500" : "text-brand-600"}`}>
              {fmt(b.value)}
            </span>
            <div
              className={`w-full rounded-t ${isNeg ? "bg-red-400" : "bg-brand-500"}`}
              style={{ height: barH }}
            />
            <span className="text-[9px] text-brand-400 truncate w-full text-center">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GoalCard({
  label,
  actual,
  target,
  isPercent = false,
}: {
  label: string;
  actual: number | null;
  target: number | null | undefined;
  isPercent?: boolean;
}) {
  if (!target) return null;
  const pct = actual !== null && target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const display = isPercent ? `${actual?.toFixed(1)}%` : actual !== null ? fmt(actual) : "—";
  const targetDisplay = isPercent ? `${target}%` : fmt(target);
  const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-brand-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4">
      <div className="flex justify-between text-xs text-brand-500 mb-1">
        <span>{label}</span>
        <span>Target: {targetDisplay}</span>
      </div>
      <div className="text-lg font-bold text-brand-900 mb-2">{display}</div>
      <div className="h-2 rounded-full bg-brand-50">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-brand-400 mt-1">{pct.toFixed(0)}% of target</p>
    </div>
  );
}

export default async function FinanceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isFinanceRole(role)) redirect("/dashboard");

  // Load last 6 months of entries
  const entries = await prisma.financeEntry.findMany({
    orderBy: { period: "asc" },
    take: 6,
  });

  const calcs = entries.map(calcFinance);

  // Current month goal
  const nowPeriod = new Date().toISOString().slice(0, 7);
  const goal = await prisma.financeGoal.findUnique({ where: { period: nowPeriod } });
  const currentCalc = calcs.find((c) => c.period === nowPeriod) ?? null;

  // AI insight
  let aiInsight: string | null = null;
  if (calcs.length > 0) {
    aiInsight = await getFinanceInsight({
      periods: calcs.map((c) => ({
        period: c.period,
        revenue: c.revenue,
        grossProfit: c.grossProfit,
        grossMarginPct: c.grossMarginPct,
        netProfit: c.netProfit,
        netMarginPct: c.netMarginPct,
        opexTotal: c.opexTotal,
        opexMarketing: entries.find((e) => e.period === c.period)?.opexMarketing ?? 0,
      })),
      goals: goal,
    }).catch(() => null);
  }

  const maxRev = Math.max(...calcs.map((c) => c.revenue), 1);
  const maxPnl = Math.max(...calcs.map((c) => Math.abs(c.netProfit)), 1);

  const latest = calcs[calcs.length - 1] ?? null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Finance Dashboard</h1>
          <p className="text-sm text-brand-500">Monthly P&amp;L overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/entry" className="btn-secondary text-sm">+ Add Entry</Link>
          {isOwnerRole(role) && (
            <Link href="/finance/goals" className="btn-primary text-sm">Set Goals</Link>
          )}
        </div>
      </div>

      {calcs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-10 text-center">
          <p className="text-brand-500 mb-3">No financial data yet. Add your first monthly P&amp;L entry to get started.</p>
          <Link href="/finance/entry" className="btn-primary">Add P&amp;L Entry</Link>
        </div>
      ) : (
        <>
          {/* Latest month summary */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Revenue" value={fmt(latest.revenue)} sub={periodLabel(latest.period)} />
              <MetricCard
                label="Gross Profit"
                value={fmt(latest.grossProfit)}
                sub={`${latest.grossMarginPct.toFixed(1)}% margin`}
                color={latest.grossProfit >= 0 ? "text-green-700" : "text-red-600"}
              />
              <MetricCard
                label="Net Profit"
                value={fmt(latest.netProfit)}
                sub={`${latest.netMarginPct.toFixed(1)}% margin`}
                color={latest.netProfit >= 0 ? "text-green-700" : "text-red-600"}
              />
              <MetricCard
                label="Break-Even"
                value={latest.breakEven ? fmt(latest.breakEven) : "—"}
                sub="monthly revenue needed"
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-1">Revenue (last {calcs.length} months)</p>
              <BarChart
                bars={calcs.map((c) => ({ label: periodLabel(c.period), value: c.revenue, max: maxRev }))}
              />
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-1">Net Profit (last {calcs.length} months)</p>
              <BarChart
                bars={calcs.map((c) => ({ label: periodLabel(c.period), value: c.netProfit, max: maxPnl }))}
              />
            </div>
          </div>

          {/* Cost breakdown for latest month */}
          {latest && (
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-3">
                Cost Breakdown — {periodLabel(latest.period)}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  { label: "COGS Total",     value: latest.cogsTotal    },
                  { label: "OpEx Fixed",     value: latest.opexFixed    },
                  { label: "OpEx Variable",  value: latest.opexVariable },
                  { label: "EBIT",           value: latest.ebit         },
                  { label: "Tax & Interest", value: entries.find((e) => e.period === latest.period)?.taxAndInterest ?? 0 },
                  { label: "Net Profit",     value: latest.netProfit    },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-brand-50 px-3 py-2">
                    <p className="text-[10px] text-brand-400">{label}</p>
                    <p className={`font-bold ${value < 0 ? "text-red-600" : "text-brand-800"}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal vs Actual */}
          {goal && currentCalc && (
            <div>
              <h2 className="text-sm font-semibold text-brand-700 mb-3">Goals — {periodLabel(nowPeriod)}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <GoalCard label="Revenue"      actual={currentCalc.revenue}       target={goal.revenueTarget} />
                <GoalCard label="Net Profit"   actual={currentCalc.netProfit}     target={goal.netProfitTarget} />
                <GoalCard label="Gross Margin" actual={currentCalc.grossMarginPct} target={goal.grossMarginTarget} isPercent />
                <GoalCard label="Total OpEx"   actual={currentCalc.opexTotal}     target={goal.opexBudget} />
                <GoalCard
                  label="Marketing Spend"
                  actual={entries.find((e) => e.period === nowPeriod)?.opexMarketing ?? null}
                  target={goal.marketingBudget}
                />
              </div>
            </div>
          )}

          {/* AI Insights */}
          {aiInsight && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-brand-600">✨</span>
                <p className="text-sm font-semibold text-brand-700">AI Recommendations</p>
              </div>
              <p className="text-sm text-brand-800 leading-relaxed whitespace-pre-line">{aiInsight}</p>
            </div>
          )}

          {/* Entry history table */}
          <div className="rounded-xl border border-brand-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Gross Profit</th>
                  <th className="px-4 py-2 text-right">Net Profit</th>
                  <th className="px-4 py-2 text-right">Margin</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {[...calcs].reverse().map((c) => (
                  <tr key={c.period} className="hover:bg-brand-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-brand-800">{periodLabel(c.period)}</td>
                    <td className="px-4 py-2 text-right text-brand-700">{fmt(c.revenue)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${c.grossProfit < 0 ? "text-red-600" : "text-green-700"}`}>
                      {fmt(c.grossProfit)}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${c.netProfit < 0 ? "text-red-600" : "text-green-700"}`}>
                      {fmt(c.netProfit)}
                    </td>
                    <td className="px-4 py-2 text-right text-brand-500">{c.netMarginPct.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/finance/entry?period=${c.period}`} className="text-brand-500 hover:text-brand-700 text-xs">
                        Edit
                      </Link>
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
