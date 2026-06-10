"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCampaign } from "@/app/campaign-actions";

export default function CreateCampaignForm({ channels }: { channels: string[] }) {
  const [state, action, pending] = useActionState(createCampaign, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Campaign name *</label>
          <input name="name" required className="input" placeholder="e.g. Eid Sale Instagram Push" />
        </div>
        <div>
          <label className="label">Channel *</label>
          <select name="channel" required className="input" defaultValue="">
            <option value="" disabled>— Select channel —</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Budget (৳)</label>
          <input name="budget" type="number" min="0" step="100" className="input" placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="label">Start date</label>
          <input name="startDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">End date</label>
          <input name="endDate" type="date" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="input resize-none" placeholder="Goal, target audience, creative notes…" />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Campaign created!</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create campaign"}
      </button>
    </form>
  );
}
