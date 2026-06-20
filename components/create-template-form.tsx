"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTemplate } from "@/app/social-actions";
import { ALL_CHANNELS, CHANNEL_CONFIG, POST_FREQUENCIES, WEEKDAYS } from "@/lib/social";

type Employee = { id: string; name: string };
type Freq = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "DAILY";

export default function CreateTemplateForm({ employees }: { employees: Employee[] }) {
  const [state, action, pending] = useActionState(createTemplate, undefined);
  const [frequency, setFrequency] = useState<Freq>("MONTHLY");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); setFrequency("MONTHLY"); }
  }, [state?.ok]);

  const isWeekly = frequency === "WEEKLY" || frequency === "BIWEEKLY";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Channel *</label>
          <select name="channel" required className="input" defaultValue="">
            <option value="" disabled>— Select —</option>
            {ALL_CHANNELS.map((ch) => {
              const c = CHANNEL_CONFIG[ch];
              return (
                <option key={ch} value={ch}>
                  {c.icon} {c.label}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label">Frequency *</label>
          <select
            name="frequency"
            className="input"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Freq)}
          >
            {POST_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {frequency === "MONTHLY" && (
          <div>
            <label className="label">Day of month (1–31) *</label>
            <input name="dayOfMonth" type="number" min="1" max="31" required className="input" placeholder="e.g. 5" />
          </div>
        )}
        {isWeekly && (
          <div>
            <label className="label">Day of week *</label>
            <select name="dayOfWeek" required className="input" defaultValue="1">
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
        )}
        {frequency === "DAILY" && (
          <div className="flex items-end">
            <p className="text-xs text-brand-700/50 pb-2">
              A post will be planned for <strong>every day</strong> of the month.
            </p>
          </div>
        )}

        <div>
          <label className="label">Time of day *</label>
          <input name="time" type="time" required defaultValue="21:00" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Topic / content idea *</label>
          <input name="topic" required className="input" placeholder="e.g. New arrival product showcase" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes / caption hints</label>
          <textarea
            name="notes"
            rows={2}
            className="input resize-none"
            placeholder="Hashtags, tone, image ideas…"
          />
        </div>
        {employees.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label">Assign to</label>
            <select name="assignedToId" className="input" defaultValue="">
              <option value="">— Unassigned —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Template saved! It will appear every month when you generate the plan.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Add recurring post"}
      </button>
    </form>
  );
}
