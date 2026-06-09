"use client";

import { useActionState } from "react";
import { sendBroadcastSMS } from "@/app/broadcast-actions";

export default function SendSmsForm({ broadcastId }: { broadcastId: string }) {
  const [state, action, pending] = useActionState(
    sendBroadcastSMS.bind(null, broadcastId),
    undefined,
  );

  // After a successful send the server revalidates and the parent page re-renders
  // (the button section disappears because status becomes SENT). The success
  // message below is shown briefly during that transition.
  return (
    <form action={action} className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-brand-900">
          <input
            type="checkbox"
            name="logToTimeline"
            defaultChecked
            className="h-4 w-4 rounded border-brand-300 text-brand-600"
          />
          Log this on each recipient&apos;s timeline
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary bg-sky-600 hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : "📱 Send SMS via BulkSMSBD"}
        </button>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠️ {state.error}
        </p>
      )}
      {state?.sent != null && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ {state.mode === "console" ? "[Console mode] " : ""}Delivered to {state.sent} recipients.
        </p>
      )}
    </form>
  );
}
