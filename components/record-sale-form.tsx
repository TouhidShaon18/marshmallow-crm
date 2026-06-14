"use client";

import { useActionState, useMemo, useState } from "react";
import { recordSale } from "@/app/affiliate-actions";
import { resolveCommission, taka, type TierLike } from "@/lib/affiliate";

type AffiliateOpt = {
  id: string;
  name: string;
  couponCode: string;
  overrides: Record<string, number>;
};

export default function RecordSaleForm({
  affiliates,
  tiers,
  categories,
  defaultAffiliateId,
}: {
  affiliates: AffiliateOpt[];
  tiers: TierLike[];
  categories: string[];
  defaultAffiliateId?: string;
}) {
  const [state, action, pending] = useActionState(recordSale, undefined);
  const [affiliateId, setAffiliateId] = useState(defaultAffiliateId ?? affiliates[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "General");

  const preview = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const aff = affiliates.find((a) => a.id === affiliateId);
    if (amt <= 0 || !aff) return null;
    return resolveCommission(tiers, amt, aff.overrides, category);
  }, [amount, affiliateId, category, affiliates, tiers]);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Creator</label>
          <select name="affiliateId" value={affiliateId} onChange={(e) => setAffiliateId(e.target.value)} className="input" required>
            {affiliates.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.couponCode})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Order amount (৳)</label>
          <input name="orderAmount" type="number" min={0} step={0.01} value={amount}
            onChange={(e) => setAmount(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Sale date</label>
          <input name="soldAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label">Order / invoice ref (optional)</label>
          <input name="orderRef" className="input" />
        </div>
        <div>
          <label className="label">Product (optional)</label>
          <input name="productName" className="input" />
        </div>
      </div>

      {/* Live commission preview */}
      {preview && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm">
          {preview.tier ? (
            <p className="text-brand-800">
              <span className="font-semibold">{category}</span> · bracket{" "}
              <span className="font-semibold">{preview.tierLabel}</span> →
              {" "}<span className="font-semibold">{preview.percent}%</span> →
              {" "}commission <span className="font-bold text-brand-700">{taka(preview.commission)}</span>
            </p>
          ) : (
            <p className="text-red-600">No commission bracket matches this amount/category. Check your tiers.</p>
          )}
        </div>
      )}

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Record sale"}
      </button>
    </form>
  );
}
