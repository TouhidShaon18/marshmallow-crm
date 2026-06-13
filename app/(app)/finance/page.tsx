import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isFinanceRole, normaliseRole } from "@/lib/auth";
import {
  calcFinance,
  formatPeriodShort,
  formatPeriodLong,
  PERIOD_TYPES,
  type FinancePeriodType,
} from "@/lib/finance";
import { getFinanceInsight } from "@/lib/ai";

const UNIT: Record<FinancePeriodType, string> = { MONTHLY: "months", WEEKLY: "weeks", DAILY: "days" };

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

function BarChart({ bars, height = 120 }: { bars: { label: string; value: number; max: number }[]; height?: number }) {
  return (
    <div className="flex items-end gap-2 pt-4 pb-6 relative" style={{ height: height + 40 }}>
      {bars.map((b, i) => {
        const pct = b.max > 0 ? Math.max(2, Math.abs(b.value) / b.max) : 0.02;
        const barH = pct * height;
        const isNeg = b.value < 0;
        return (
          <div key={`${b.label}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <span className={`text-[10px] font-medium ${isNeg ? "text-red-500" : "text-brand-600"}`}>{fmt(b.value)}</span>
            <div className={`w-full rounded-t ${isNeg ? "bg-red-400" : "bg-brand-500"}`} style={{ height: barH }} />
            <span className="text-[9px] text-brand-400 truncate w-full text-center">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GoalCard({ label, actual, target, isPercent = false }: { label: string; actual: number | null; target: number | null | undefined; isPercent?: boolean }) {
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

export default async function FinanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isFinanceRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const view: FinancePeriodType = (["DAILY", "WEEKLY", "MONTHLY"].includes(params.view ?? "")
    ? params.view
    : "MONTHLY") as FinancePeriodType;
  const unit = UNIT[view];

  // Latest N entries of the selected granularity (newest first from DB, then chronological for charts).
  const recent = await prisma.financeEntry.findMany({
    where: { periodType: view },
    orderBy: { period: "desc" },
    take: 8,
  });
  const entries = [...recent].reverse(); // oldest → newest
  const calcs = entries.map(calcFinance);

  // Goals are monthly only — compared against the current month's monthly entry.
  const nowMonth = new Date().toISOString().slice(0, 7);
  const goal = view === "MONTHLY" ? await prisma.financeGoal.findUnique({ where: { period: nowMonth } }) : null;
  const currentCalc = view === "MONTHLY" ? calcs.find((c) => c.period === nowMonth) ?? null : null;

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
          <p className="text-sm text-brand-500">P&amp;L overview</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/finance/entry?type=${view}`} className="btn-secondary text-sm">+ Add Entry</Link>
          {isOwnerRole(role) && (
            <Link href="/finance/goals" className="btn-primary text-sm">Set Goals</Link>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="inline-flex rounded-lg border border-brand-200 bg-white p-1 text-sm">
        {PERIOD_TYPES.map((pt) => (
          <Link
            key={pt.value}
            href={`/finance?view=${pt.value}`}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
              view === pt.value ? "bg-brand-600 text-white" : "text-brand-700 hover:bg-brand-50"
            }`}
          >
            {pt.label}
          </Link>
        ))}
      </div>

      {calcs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-10 text-center">
          <p className="text-brand-500 mb-3">No {view.toLowerCase()} P&amp;L entries yet. Add one to get started.</p>
          <Link href={`/finance/entry?type=${view}`} className="btn-primary">Add P&amp;L Entry</Link>
        </div>
      ) : (
        <>
          {/* Latest period summary */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Revenue" value={fmt(latest.revenue)} sub={formatPeriodLong(view, latest.period)} />
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
                sub={`revenue needed / ${view === "MONTHLY" ? "month" : view === "WEEKLY" ? "week" : "day"}`}
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-1">Revenue (last {calcs.length} {unit})</p>
              <BarChart bars={calcs.map((c) => ({ label: formatPeriodShort(view, c.period), value: c.revenue, max: maxRev }))} />
            </div>
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-1">Net Profit (last {calcs.length} {unit})</p>
              <BarChart bars={calcs.map((c) => ({ label: formatPeriodShort(view, c.period), value: c.netProfit, max: maxPnl }))} />
            </div>
          </div>

          {/* Cost breakdown for latest period */}
          {latest && (
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <p className="text-sm font-semibold text-brand-700 mb-3">
                Cost Breakdown — {formatPeriodLong(view, latest.period)}
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

          {/* Goal vs Actual (monthly only) */}
          {goal && currentCalc && (
            <div>
              <h2 className="text-sm font-semibold text-brand-700 mb-3">Goals — {formatPeriodLong("MONTHLY", nowMonth)}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <GoalCard label="Revenue"      actual={currentCalc.revenue}        target={goal.revenueTarget} />
                <GoalCard label="Net Profit"   actual={currentCalc.netProfit}      target={goal.netProfitTarget} />
                <GoalCard label="Gross Margin" actual={currentCalc.grossMarginPct} target={goal.grossMarginTarget} isPercent />
                <GoalCard label="Total OpEx"   actual={currentCalc.opexTotal}      target={goal.opexBudget} />
                <GoalCard
                  label="Marketing Spend"
                  actual={entries.find((e) => e.period === nowMonth)?.opexMarketing ?? null}
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
                    <td className="px-4 py-2 font-medium text-brand-800">{formatPeriodLong(view, c.period)}</td>
                    <td className="px-4 py-2 text-right text-brand-700">{fmt(c.revenue)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${c.grossProfit < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(c.grossProfit)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${c.netProfit < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(c.netProfit)}</td>
                    <td className="px-4 py-2 text-right text-brand-500">{c.netMarginPct.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/finance/entry?type=${view}&period=${c.period}`} className="text-brand-500 hover:text-brand-700 text-xs">
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
