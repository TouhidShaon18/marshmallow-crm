"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEmployee } from "@/app/actions";

const DEPT_LABEL: Record<string, string> = {
  SALES: "🛍️ Sales", MARKETING: "📣 Marketing", FINANCE: "💰 Finance",
};
const TIER_LABEL: Record<string, string> = {
  MANAGER: "🧭 Sales & Marketing Manager",
  ADMIN: "🛡️ Admin (no API keys / integrations)",
  OWNER: "👑 Super Admin (full access)",
};

export default function EmployeeForm({
  depts,
  tiers,
}: {
  depts: string[]; // department areas the creator can grant
  tiers: string[]; // elevated tiers the creator can assign (MANAGER/ADMIN/OWNER)
}) {
  const [state, action, pending] = useActionState(createEmployee, {});
  const [tier, setTier] = useState("STAFF");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); setTier("STAFF"); }
  }, [state?.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input name="password" required minLength={6} className="input" />
        </div>
        <div>
          <label className="label">Team member type</label>
          <select name="tier" value={tier} onChange={(e) => setTier(e.target.value)} className="input">
            <option value="STAFF">👤 Staff — pick access areas below</option>
            {tiers.map((t) => (
              <option key={t} value={t}>{TIER_LABEL[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {tier === "STAFF" && (
        <div>
          <label className="label">Access areas</label>
          <div className="flex flex-wrap gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
            {depts.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm text-brand-800">
                <input type="checkbox" name="dept" value={d} defaultChecked={d === "SALES"} className="h-4 w-4 accent-brand-600" />
                {DEPT_LABEL[d] ?? d}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-brand-700/50">
            Tick every area this person should access — e.g. both Sales and Marketing.
          </p>
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Team member added.</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding…" : "Add team member"}
      </button>
    </form>
  );
}
