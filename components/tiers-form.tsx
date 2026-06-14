"use client";

import { useActionState, useId, useState } from "react";
import { saveTiers } from "@/app/affiliate-actions";
import { CATEGORY_SUGGESTIONS } from "@/lib/affiliate";
import type { CommissionTier } from "@prisma/client";

let seq = 0;
type Row = { key: string; id: string; category: string; label: string; min: string; max: string; percent: string };
const newRow = (t?: CommissionTier): Row => ({
  key: `t${seq++}`,
  id: t?.id ?? "",
  category: t?.category ?? "General",
  label: t?.label ?? "",
  min: t ? String(t.minAmount) : "0",
  max: t?.maxAmount != null ? String(t.maxAmount) : "",
  percent: t ? String(t.percent) : "",
});

export default function TiersForm({ tiers }: { tiers: CommissionTier[] }) {
  const [state, action, pending] = useActionState(saveTiers, undefined);
  const [rows, setRows] = useState<Row[]>(tiers.length ? tiers.map((t) => newRow(t)) : [newRow()]);
  const catListId = useId();

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const add = (category = "General") => setRows((rs) => [...rs, { ...newRow(), category }]);

  return (
    <form action={action} className="space-y-3">
      <datalist id={catListId}>
        {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="hidden sm:grid grid-cols-[1fr_1.3fr_0.7fr_0.7fr_0.6fr_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
        <span>Category</span>
        <span>Bracket label</span>
        <span>Min ৳ (incl.)</span>
        <span>Max ৳ (excl.)</span>
        <span>Comm. %</span>
        <span />
      </div>

      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-2 sm:grid-cols-[1fr_1.3fr_0.7fr_0.7fr_0.6fr_auto] gap-2 items-center">
          <input name="tierCategory" list={catListId} value={r.category} onChange={(e) => update(r.key, { category: e.target.value })}
            placeholder="General" className="input" />
          <input type="hidden" name="tierId" value={r.id} />
          <input name="tierLabel" value={r.label} onChange={(e) => update(r.key, { label: e.target.value })}
            placeholder="Under ৳3,000" className="input" />
          <input name="tierMin" type="number" min={0} value={r.min} onChange={(e) => update(r.key, { min: e.target.value })}
            placeholder="0" className="input" />
          <input name="tierMax" type="number" min={0} value={r.max} onChange={(e) => update(r.key, { max: e.target.value })}
            placeholder="∞ (blank)" className="input" />
          <input name="tierPercent" type="number" min={0} step={0.1} value={r.percent} onChange={(e) => update(r.key, { percent: e.target.value })}
            placeholder="%" className="input" />
          <button type="button" onClick={() => remove(r.key)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-400 hover:bg-red-50 hover:text-red-500" aria-label="Remove">✕</button>
        </div>
      ))}

      <button type="button" onClick={() => add()} className="text-sm font-medium text-brand-600 hover:text-brand-700">
        + Add bracket
      </button>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <div className="pt-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save tiers"}
        </button>
        <p className="mt-2 text-xs text-brand-400">
          Group brackets by <span className="font-medium">Category</span> (e.g. Figures, Apparel). The
          {" "}<span className="font-medium">General</span> category is the fallback used when a sale&apos;s category
          has no matching bracket. Leave Max blank for the open-ended top bracket (e.g. ৳100,000+). Editing a bracket
          only affects future sales.
        </p>
      </div>
    </form>
  );
}
