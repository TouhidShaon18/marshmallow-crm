"use client";

import { useActionState, useEffect } from "react";
import { upsertFinanceGoal } from "@/app/finance-actions";
import type { FinanceGoal } from "@prisma/client";

type Props = {
  existing?: FinanceGoal | null;
  defaultPeriod: string;
};

function OptField({ name, label, defaultValue, suffix }: { name: string; label: string; defaultValue?: number | null; suffix?: string }) {
  return (
    <div>
      <label className="label">{label}{suffix && <span className="text-brand-400 ml-1 font-normal">({suffix})</span>}</label>
      <input
        name={name}
        type="number"
        min={0}
        step={suffix === "%" ? 0.1 : 1}
        defaultValue={defaultValue ?? ""}
        placeholder="Leave blank to skip"
        className="input"
      />
    </div>
  );
}

export default function FinanceGoalsForm({ existing, defaultPeriod }: Props) {
  const [state, action, pending] = useActionState(upsertFinanceGoal, undefined);

  useEffect(() => {
    if (state && !state.error) {
      window.location.href = "/finance";
    }
  }, [state]);

  const e = existing;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="period" value={e?.period ?? defaultPeriod} />

      <div className="grid gap-4 sm:grid-cols-2">
        <OptField name="revenueTarget"     label="Revenue Target"     defaultValue={e?.revenueTarget}     suffix="৳" />
        <OptField name="netProfitTarget"   label="Net Profit Target"  defaultValue={e?.netProfitTarget}   suffix="৳" />
        <OptField name="grossMarginTarget" label="Gross Margin Target" defaultValue={e?.grossMarginTarget} suffix="%" />
        <OptField name="opexBudget"        label="Total OpEx Budget"  defaultValue={e?.opexBudget}        suffix="৳" />
        <OptField name="marketingBudget"   label="Marketing Budget"   defaultValue={e?.marketingBudget}   suffix="৳" />
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} className="input" defaultValue={e?.notes ?? ""} placeholder="Optional context…" />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save Goals"}
      </button>
    </form>
  );
}
