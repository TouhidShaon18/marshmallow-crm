"use client";

import { useState, useActionState } from "react";
import { setEmployeeTarget } from "@/app/target-actions";

type Props = {
  userId: string;
  name: string;
  period: string;
  current: {
    revenueTarget: number | null;
    contactTarget: number | null;
    newCustomerTarget: number | null;
  } | null;
};

export default function SetTargetForm({ userId, name, period, current }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(setEmployeeTarget, undefined);

  // Close after successful save
  if (state !== undefined && !state?.error && open) setOpen(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary text-xs"
      >
        {current?.revenueTarget || current?.contactTarget || current?.newCustomerTarget
          ? "Edit target"
          : "Set target"}
      </button>

      {open && (
        <form
          action={action}
          className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-3"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="period" value={period} />
          <p className="text-xs font-semibold text-brand-700">
            Monthly target for {name} — {period}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label text-xs">💰 Revenue (৳)</label>
              <input
                name="revenueTarget"
                type="number"
                min="0"
                step="100"
                defaultValue={current?.revenueTarget ?? ""}
                placeholder="e.g. 50000"
                className="input"
              />
            </div>
            <div>
              <label className="label text-xs">💬 Contacts</label>
              <input
                name="contactTarget"
                type="number"
                min="0"
                defaultValue={current?.contactTarget ?? ""}
                placeholder="e.g. 30"
                className="input"
              />
            </div>
            <div>
              <label className="label text-xs">👤 New customers</label>
              <input
                name="newCustomerTarget"
                type="number"
                min="0"
                defaultValue={current?.newCustomerTarget ?? ""}
                placeholder="e.g. 10"
                className="input"
              />
            </div>
          </div>

          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? "Saving…" : "Save target"}
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
