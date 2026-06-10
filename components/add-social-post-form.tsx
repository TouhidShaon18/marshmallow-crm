"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { createOneOffPost } from "@/app/social-actions";
import { ALL_CHANNELS, CHANNEL_CONFIG } from "@/lib/social";

type Employee = { id: string; name: string };

export default function AddSocialPostForm({
  employees,
  defaultDate,
}: {
  employees: Employee[];
  defaultDate: string; // "YYYY-MM-DD"
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createOneOffPost, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); setOpen(false); }
  }, [state?.ok]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        + One-off post
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">Add one-off post</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs">Channel *</label>
          <select name="channel" required className="input text-sm" defaultValue="">
            <option value="" disabled>— Select —</option>
            {ALL_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>{CHANNEL_CONFIG[ch].icon} {CHANNEL_CONFIG[ch].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Scheduled date *</label>
          <input name="scheduledDate" type="date" required className="input text-sm" defaultValue={defaultDate} />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Topic *</label>
          <input name="topic" required className="input text-sm" placeholder="e.g. Flash sale promo" />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Notes</label>
          <input name="notes" className="input text-sm" placeholder="Caption hints, hashtags…" />
        </div>
        {employees.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label text-xs">Assign to</label>
            <select name="assignedToId" className="input text-sm" defaultValue="">
              <option value="">— Unassigned —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? "Adding…" : "Add post"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
      </div>
    </form>
  );
}
