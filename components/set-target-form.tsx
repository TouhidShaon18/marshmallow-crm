"use client";

import { useState, useActionState } from "react";
import { setEmployeeTarget } from "@/app/target-actions";

type CurrentTarget = {
  revenueTarget:        number | null;
  contactTarget:        number | null;
  followup7dTarget:     number | null;
  followup30dTarget:    number | null;
  convertedSaleTarget:  number | null;
  repeatSaleTarget:     number | null;
  newCustomerTarget:    number | null;
} | null;

type Props = {
  userId:  string;
  name:    string;
  period:  string;
  current: CurrentTarget;
};

type Field = {
  name:        string;
  label:       string;
  placeholder: string;
  isFloat?:    boolean;
};

const FIELDS: Field[] = [
  { name: "revenueTarget",        label: "💰 Revenue (৳)",         placeholder: "e.g. 50000", isFloat: true },
  { name: "contactTarget",        label: "💬 Total contacts",       placeholder: "e.g. 60" },
  { name: "followup7dTarget",     label: "⚡ Follow-up ≤7 days",    placeholder: "e.g. 20" },
  { name: "followup30dTarget",    label: "📅 Follow-up ≤30 days",   placeholder: "e.g. 40" },
  { name: "convertedSaleTarget",  label: "✅ Converted sales",      placeholder: "e.g. 15" },
  { name: "repeatSaleTarget",     label: "🔁 Repeat sales",         placeholder: "e.g. 10" },
  { name: "newCustomerTarget",    label: "👤 New customers",        placeholder: "e.g. 20" },
];

export default function SetTargetForm({ userId, name, period, current }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(setEmployeeTarget, undefined);

  // Close automatically on successful save
  if (state !== undefined && !state?.error && open) setOpen(false);

  const hasTarget = current && Object.values(current).some(Boolean);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary text-xs"
      >
        {hasTarget ? "Edit target" : "Set target"}
      </button>

      {open && (
        <form
          action={action}
          className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-3"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="period" value={period} />
          <p className="text-xs font-semibold text-brand-700">
            Monthly targets for {name} — {period}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="label text-xs">{f.label}</label>
                <input
                  name={f.name}
                  type="number"
                  min="0"
                  step={f.isFloat ? "100" : "1"}
                  defaultValue={(current as Record<string, number | null> | null)?.[f.name] ?? ""}
                  placeholder={f.placeholder}
                  className="input"
                />
              </div>
            ))}
          </div>

          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? "Saving…" : "Save targets"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
