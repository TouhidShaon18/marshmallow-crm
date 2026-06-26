"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEmployee } from "@/app/actions";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "SALES",     label: "🛍️ Sales — customers, follow-ups, pipeline" },
  { value: "MARKETING", label: "📣 Marketing — broadcasts, campaigns, affiliates" },
  { value: "FINANCE",   label: "💰 Finance — P&L entries, financial dashboard" },
  { value: "MANAGER",   label: "🧭 Sales & Marketing Manager — all Sales + Marketing" },
  { value: "ADMIN",     label: "🛡️ Admin — full access, except API keys & integrations" },
  { value: "OWNER",     label: "👑 Super Admin — full access incl. API keys & integrations" },
];

export default function EmployeeForm({ allowedRoles }: { allowedRoles: string[] }) {
  const [state, action, pending] = useActionState(createEmployee, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  const options = ROLE_OPTIONS.filter((o) => allowedRoles.includes(o.value));
  const showsElevated = allowedRoles.some((r) => ["MANAGER", "ADMIN", "OWNER"].includes(r));

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
          <label className="label">Role</label>
          <select name="role" className="input" defaultValue="SALES">
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {showsElevated && (
            <p className="mt-1 text-xs text-brand-700/50">
              A Manager runs all Sales &amp; Marketing (and their people) but not Finance or integrations.
            </p>
          )}
        </div>
      </div>

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
