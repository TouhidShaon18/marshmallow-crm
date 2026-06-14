"use client";

import { useActionState, useState } from "react";
import { saveTiers } from "@/app/affiliate-actions";
import type { CommissionTier } from "@prisma/client";

let seq = 0;
type Row = { key: string; id: string; label: string; min: string; max: string; percent: string };
const newRow = (t?: CommissionTier): Row => ({
  key: `t${seq++}`,
  id: t?.id ?? "",
  label: t?.label ?? "",
  min: t ? String(t.minAmount) : "0",
  max: t?.maxAmount != null ? String(t.maxAmount) : "",
  percent: t ? String(t.percent) : "",
});

export default function TiersForm({ tiers }: { tiers: CommissionTier[] }) {
  const [state, action, pending] = useActionState(saveTiers, undefined);
  const [rows, setRows] = useState<Row[]>(tiers.length ? tiers.map((t) => newRow(t)) : [newRow()]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const add = () => setRows((rs) => [...rs, newRow()]);

  return (
    <form action={action} className="space-y-3">
      <div className="hidden sm:grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_auto] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
        <span>Bracket label</span>
        <span>Min ৳ (incl.)</span>
        <span>Max ৳ (excl.)</span>
        <span>Commission %</span>
        <span />
      </div>

      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_auto] gap-2 items-center">
          <input type="hidden" name="tierId" value={r.id} />
          <input name="tierLabel" value={r.label} onChange={(e) => update(r.key, { label: e.target.value })}
            placeholder="Under ৳3,000" className="input col-span-2 sm:col-span-1" />
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

      <button type="button" onClick={add} className="text-sm font-medium text-brand-600 hover:text-brand-700">
        + Add bracket
      </button>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <div className="pt-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save tiers"}
        </button>
        <p className="mt-2 text-xs text-brand-400">
          Leave Max blank for the top, open-ended bracket (e.g. ৳100,000+). Editing a bracket only affects
          future sales — past commissions keep the rate they were recorded at.
        </p>
      </div>
    </form>
  );
}
