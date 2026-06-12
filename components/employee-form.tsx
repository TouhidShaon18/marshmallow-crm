"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEmployee } from "@/app/actions";

export default function EmployeeForm() {
  const [state, action, pending] = useActionState(createEmployee, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
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
          <label className="label">Department</label>
          <select name="role" className="input" defaultValue="SALES">
            <option value="SALES">🛍️ Sales — customers, follow-ups, pipeline</option>
            <option value="MARKETING">📣 Marketing — broadcasts, campaigns, automations</option>
            <option value="OWNER">👑 Admin / Owner — full access to everything</option>
            <option value="FINANCE">💰 Finance — P&amp;L entries, financial dashboard</option>
          </select>
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
