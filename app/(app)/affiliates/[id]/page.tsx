import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isMarketingRole, normaliseRole } from "@/lib/auth";
import { deleteAffiliate, deleteSale, recordPayout, saveOverrides } from "@/app/affiliate-actions";
import DeleteButton from "@/components/delete-button";
import AffiliateForm from "@/components/affiliate-form";
import { taka } from "@/lib/affiliate";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AffiliateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isMarketingRole(role)) redirect("/dashboard");
  const isOwner = isOwnerRole(role);

  const { id } = await params;
  const { edit } = await searchParams;

  const [affiliate, tiers] = await Promise.all([
    prisma.affiliate.findUnique({
      where: { id },
      include: {
        overrides: true,
        sales: { orderBy: { soldAt: "desc" } },
        payouts: { orderBy: { paidAt: "desc" } },
      },
    }),
    prisma.commissionTier.findMany({ orderBy: [{ category: "asc" }, { minAmount: "asc" }] }),
  ]);
  if (!affiliate) notFound();

  const overrideMap: Record<string, number> = {};
  affiliate.overrides.forEach((o) => { overrideMap[o.tierId] = o.percent; });

  const earned = affiliate.sales.reduce((t, s) => t + s.commission, 0);
  const paid = affiliate.sales.filter((s) => s.paid).reduce((t, s) => t + s.commission, 0);
  const owed = earned - paid;
  const salesTotal = affiliate.sales.reduce((t, s) => t + s.orderAmount, 0);

  if (edit) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/affiliates/${id}`} className="text-brand-500 hover:text-brand-700 text-sm">← Back</Link>
          <h1 className="text-xl font-bold text-brand-900">Edit creator</h1>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <AffiliateForm existing={affiliate} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-brand-100 bg-white p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-900">{affiliate.name}</h1>
            {!affiliate.active && <span className="badge bg-gray-100 text-gray-500">inactive</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-500">
            <span className="badge bg-brand-100 text-brand-700 font-mono">{affiliate.couponCode}</span>
            {affiliate.platform && <span>{affiliate.platform}</span>}
            {affiliate.socialHandle && <span>· {affiliate.socialHandle}</span>}
            {affiliate.phone && <span>· {affiliate.phone}</span>}
            {affiliate.email && <span>· {affiliate.email}</span>}
          </div>
          {affiliate.notes && <p className="mt-2 text-sm text-brand-600">{affiliate.notes}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/affiliates/sales/new?affiliate=${id}`} className="btn-primary text-sm">+ Record sale</Link>
          <Link href={`/affiliates/${id}?edit=1`} className="text-sm text-brand-600 hover:underline">Edit</Link>
          <DeleteButton
            action={deleteAffiliate.bind(null, id)}
            message={`Delete ${affiliate.name} and all their sales & payouts? This cannot be undone.`}
          />
        </div>
      </div>

      {/* Commission summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Attributed sales", value: taka(salesTotal) },
          { label: "Commission earned", value: taka(earned) },
          { label: "Paid out", value: taka(paid) },
          { label: "Owed", value: taka(owed), accent: owed > 0 },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-brand-100 bg-white p-4">
            <p className="text-xs text-brand-500">{c.label}</p>
            <p className={`mt-1 text-lg font-bold ${c.accent ? "text-amber-600" : "text-brand-900"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Record payout */}
      {owed > 0 && (
        <form action={recordPayout.bind(null, id)} className="rounded-xl border border-brand-100 bg-white p-5 space-y-3">
          <h2 className="section-heading">Record payout</h2>
          <p className="text-sm text-brand-600">
            This settles the full outstanding <span className="font-semibold text-amber-600">{taka(owed)}</span> and
            marks all unpaid commissions as paid.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Method</label>
              <input name="method" placeholder="bKash / Bank / Cash" className="input" />
            </div>
            <div>
              <label className="label">Reference</label>
              <input name="reference" placeholder="Trx ID" className="input" />
            </div>
            <div>
              <label className="label">Note</label>
              <input name="note" className="input" />
            </div>
          </div>
          <button type="submit" className="btn-primary">Pay out {taka(owed)}</button>
        </form>
      )}

      {/* Commission rates / overrides */}
      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <h2 className="section-heading">Commission rates</h2>
        {tiers.length === 0 ? (
          <p className="text-sm text-brand-500">
            No commission tiers yet.{" "}
            {isOwner && <Link href="/affiliates/tiers" className="font-semibold underline">Set them up →</Link>}
          </p>
        ) : isOwner ? (
          <form action={saveOverrides.bind(null, id)} className="space-y-2">
            <p className="text-sm text-brand-500 mb-2">
              Leave a row blank to use the default rate, or enter a custom % to override it for {affiliate.name}.
            </p>
            <div className="hidden sm:grid grid-cols-[1.6fr_0.7fr_1fr] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
              <span>Category · Bracket</span><span>Default</span><span>Override %</span>
            </div>
            {tiers.map((t) => (
              <div key={t.id} className="grid grid-cols-[1.6fr_0.7fr_1fr] gap-2 items-center">
                <input type="hidden" name="overrideTierId" value={t.id} />
                <span className="text-sm text-brand-700"><span className="text-brand-400">{t.category}</span> · {t.label}</span>
                <span className="text-sm text-brand-400">{t.percent}%</span>
                <input
                  name="overrideValue"
                  type="number"
                  min={0}
                  step={0.1}
                  defaultValue={overrideMap[t.id] ?? ""}
                  placeholder={`${t.percent} (default)`}
                  className="input"
                />
              </div>
            ))}
            <button type="submit" className="btn-secondary text-sm mt-2">Save rates</button>
          </form>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-brand-50">
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td className="py-1.5 text-brand-700"><span className="text-brand-400">{t.category}</span> · {t.label}</td>
                  <td className="py-1.5 text-right font-medium text-brand-800">
                    {overrideMap[t.id] ?? t.percent}%
                    {overrideMap[t.id] != null && <span className="ml-1 text-xs text-brand-400">(custom)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sales */}
      <div className="rounded-xl border border-brand-100 bg-white overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-700">Sales ({affiliate.sales.length})</h2>
        </div>
        {affiliate.sales.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-brand-400">No sales recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Bracket</th>
                <th className="px-4 py-2 text-right">%</th>
                <th className="px-4 py-2 text-right">Commission</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {affiliate.sales.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50">
                  <td className="px-4 py-2 text-brand-600">{fmtDate(s.soldAt)}</td>
                  <td className="px-4 py-2 text-brand-700">
                    {s.orderRef || "—"}
                    {s.productName && <span className="block text-xs text-brand-400">{s.productName}</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-brand-700">{taka(s.orderAmount)}</td>
                  <td className="px-4 py-2 text-brand-500">
                    {s.tierLabel}
                    {s.category && <span className="block text-xs text-brand-400">{s.category}</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-brand-500">{s.percent}%</td>
                  <td className="px-4 py-2 text-right font-medium text-brand-800">{taka(s.commission)}</td>
                  <td className="px-4 py-2 text-center">
                    {s.paid
                      ? <span className="badge bg-green-100 text-green-700">paid</span>
                      : <span className="badge bg-amber-100 text-amber-700">unpaid</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteButton action={deleteSale.bind(null, s.id, id)} label="✕"
                      className="text-brand-300 hover:text-red-500" message="Delete this sale?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payout history */}
      {affiliate.payouts.length > 0 && (
        <div className="rounded-xl border border-brand-100 bg-white overflow-x-auto">
          <h2 className="px-4 py-3 text-sm font-semibold text-brand-700">Payout history</h2>
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Reference</th>
                <th className="px-4 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {affiliate.payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-brand-600">{fmtDate(p.paidAt)}</td>
                  <td className="px-4 py-2 text-right font-medium text-green-700">{taka(p.amount)}</td>
                  <td className="px-4 py-2 text-brand-600">{p.method || "—"}</td>
                  <td className="px-4 py-2 text-brand-600">{p.reference || "—"}</td>
                  <td className="px-4 py-2 text-brand-600">{p.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
