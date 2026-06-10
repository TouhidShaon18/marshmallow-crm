"use client";

import { useState, useActionState } from "react";
import { setEmployeeTarget } from "@/app/target-actions";
import type { AppRole } from "@/lib/auth";

type CurrentTarget = {
  revenueTarget?:        number | null;
  contactTarget?:        number | null;
  followup7dTarget?:     number | null;
  followup30dTarget?:    number | null;
  convertedSaleTarget?:  number | null;
  repeatSaleTarget?:     number | null;
  newCustomerTarget?:    number | null;
  postsTarget?:          number | null;
  viewsTarget?:          number | null;
  reactsTarget?:         number | null;
  commentsTarget?:       number | null;
  sharesTarget?:         number | null;
} | null;

const SALES_FIELDS: { name: string; label: string; placeholder: string; isFloat?: boolean }[] = [
  { name: "revenueTarget",       label: "💰 Revenue (৳)",       placeholder: "50000", isFloat: true },
  { name: "contactTarget",       label: "💬 Total contacts",     placeholder: "60"    },
  { name: "followup7dTarget",    label: "⚡ Follow-up ≤7 days",  placeholder: "20"    },
  { name: "followup30dTarget",   label: "📅 Follow-up ≤30 days", placeholder: "40"    },
  { name: "convertedSaleTarget", label: "✅ Converted sales",    placeholder: "15"    },
  { name: "repeatSaleTarget",    label: "🔁 Repeat sales",       placeholder: "10"    },
  { name: "newCustomerTarget",   label: "👤 New customers",      placeholder: "20"    },
];

const MARKETING_FIELDS: { name: string; label: string; placeholder: string; isFloat?: boolean }[] = [
  { name: "postsTarget",    label: "📅 Posts to publish",  placeholder: "20"   },
  { name: "viewsTarget",    label: "👁️ Views target",      placeholder: "10000" },
  { name: "reactsTarget",   label: "❤️ Reactions target",  placeholder: "500"  },
  { name: "commentsTarget", label: "💬 Comments target",   placeholder: "100"  },
  { name: "sharesTarget",   label: "🔁 Shares target",     placeholder: "50"   },
];

type Props = {
  userId:  string;
  name:    string;
  period:  string;
  role:    AppRole;
  current: CurrentTarget;
};

export default function SetTargetForm({ userId, name, period, role, current }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(setEmployeeTarget, undefined);

  if (state !== undefined && !state?.error && open) setOpen(false);

  const fields = role === "MARKETING" ? MARKETING_FIELDS : SALES_FIELDS;
  const hasTarget = current && Object.values(current).some(Boolean);

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-secondary text-xs">
        {hasTarget ? "Edit target" : "Set target"}
      </button>

      {open && (
        <form action={action} className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="period" value={period} />
          <p className="text-xs font-semibold text-brand-700">
            {role === "MARKETING" ? "📣" : "🛍️"} Monthly targets for {name} — {period}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label text-xs">{f.label}</label>
                <input
                  name={f.name}
                  type="number"
                  min="0"
                  step={f.isFloat ? "100" : "1"}
                  defaultValue={(current as Record<string, number | null | undefined> | null)?.[f.name] ?? ""}
                  placeholder={f.placeholder}
                  className="input"
                />
              </div>
            ))}
          </div>

          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? "Saving…" : "Save targets"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
