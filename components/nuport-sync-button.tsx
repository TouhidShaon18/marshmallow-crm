"use client";

import { useActionState } from "react";
import { triggerNuportSync } from "@/app/nuport-actions";

export default function NuportSyncButton() {
  const [state, action, pending] = useActionState(triggerNuportSync, undefined);

  return (
    <div className="space-y-2">
      <form action={action}>
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? "Syncing…" : "🔄 Sync now"}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state !== undefined && !state?.error && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          ✅ Sync complete — <strong>{state.created ?? 0}</strong> new customers added
          {(state.total ?? 0) > 0 && ` out of ${state.total} total in Nuport`}.
        </p>
      )}
    </div>
  );
}
