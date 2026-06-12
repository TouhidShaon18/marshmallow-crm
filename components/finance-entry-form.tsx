"use client";

import { useActionState, useEffect } from "react";
import { upsertFinanceEntry } from "@/app/finance-actions";
import type { FinanceEntry } from "@prisma/client";

type Props = {
  existing?: FinanceEntry | null;
  defaultPeriod: string;
};

function NumField({ name, label, defaultValue = 0 }: { name: string; label: string; defaultValue?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        name={name}
        type="number"
        min={0}
        step={0.01}
        defaultValue={defaultValue}
        className="input"
      />
    </div>
  );
}

export default function FinanceEntryForm({ existing, defaultPeriod }: Props) {
  const [state, action, pending] = useActionState(upsertFinanceEntry, undefined);

  useEffect(() => {
    if (state && !state.error) {
      window.location.href = "/finance";
    }
  }, [state]);

  const e = existing;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="period" value={existing?.period ?? defaultPeriod} />

      {/* Revenue */}
      <section>
        <h2 className="section-heading">Revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField name="revenue" label="Total Revenue (৳)" defaultValue={e?.revenue ?? 0} />
        </div>
      </section>

      {/* COGS */}
      <section>
        <h2 className="section-heading">Cost of Goods Sold (COGS)</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <NumField name="cogsRawMaterials" label="Raw Materials"     defaultValue={e?.cogsRawMaterials ?? 0} />
          <NumField name="cogsLabour"       label="Labour"            defaultValue={e?.cogsLabour       ?? 0} />
          <NumField name="cogsPackaging"    label="Packaging"         defaultValue={e?.cogsPackaging    ?? 0} />
          <NumField name="cogsDirectProd"   label="Direct Production" defaultValue={e?.cogsDirectProd   ?? 0} />
          <NumField name="cogsMisc"         label="Misc COGS"         defaultValue={e?.cogsMisc         ?? 0} />
        </div>
      </section>

      {/* OpEx Fixed */}
      <section>
        <h2 className="section-heading">Operating Expenses — Fixed</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <NumField name="opexRent"          label="Rent"          defaultValue={e?.opexRent          ?? 0} />
          <NumField name="opexSalaries"      label="Salaries"      defaultValue={e?.opexSalaries      ?? 0} />
          <NumField name="opexSubscriptions" label="Subscriptions" defaultValue={e?.opexSubscriptions ?? 0} />
        </div>
      </section>

      {/* OpEx Variable */}
      <section>
        <h2 className="section-heading">Operating Expenses — Variable</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <NumField name="opexUtilities"  label="Utilities"       defaultValue={e?.opexUtilities  ?? 0} />
          <NumField name="opexMarketing"  label="Marketing"       defaultValue={e?.opexMarketing  ?? 0} />
          <NumField name="opexLogistics"  label="Logistics"       defaultValue={e?.opexLogistics  ?? 0} />
          <NumField name="opexMiscVar"    label="Misc Variable"   defaultValue={e?.opexMiscVar    ?? 0} />
        </div>
      </section>

      {/* Tax & Interest */}
      <section>
        <h2 className="section-heading">Tax &amp; Interest</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField name="taxAndInterest" label="Tax + Interest (৳)" defaultValue={e?.taxAndInterest ?? 0} />
        </div>
      </section>

      {/* Notes */}
      <section>
        <label className="label">Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          className="input"
          defaultValue={e?.notes ?? ""}
          placeholder="Any context for this month…"
        />
      </section>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save P&L Entry"}
      </button>
    </form>
  );
}
