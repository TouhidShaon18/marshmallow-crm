"use client";

import { useActionState } from "react";
import { saveChannelAssignments } from "@/app/social-actions";
import { ALL_CHANNELS, CHANNEL_CONFIG } from "@/lib/social";

type Employee = { id: string; name: string };

export default function ChannelAssignForm({
  employees,
  current,
}: {
  employees: Employee[];
  current: Record<string, string | null>;
}) {
  const [state, action, pending] = useActionState(saveChannelAssignments, undefined);

  return (
    <form action={action} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_CHANNELS.map((ch) => {
          const cfg = CHANNEL_CONFIG[ch];
          return (
            <div key={ch} className="flex items-center gap-2">
              <span className={`inline-flex w-32 shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
              <select name={`assign_${ch}`} defaultValue={current[ch] ?? ""} className="input py-1.5 text-sm">
                <option value="">— Unassigned —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved! Templates and planned posts for each channel were reassigned.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2">
        {pending ? "Saving…" : "Save channel owners"}
      </button>
      <p className="text-xs text-brand-700/50">
        Assigning a channel updates all its templates and <strong>planned</strong> posts. Already-posted items keep their owner.
      </p>
    </form>
  );
}
