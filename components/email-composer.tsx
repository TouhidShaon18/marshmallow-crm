"use client";

import { useActionState } from "react";
import { sendCustomerEmail } from "@/app/actions";

export default function EmailComposer({
  customerId,
  to,
}: {
  customerId: string;
  to: string | null;
}) {
  const [state, action, pending] = useActionState(sendCustomerEmail, {});

  if (!to) {
    return (
      <p className="text-sm text-brand-700/60">
        No email address on file. Add one to send emails.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div>
        <label className="label">To</label>
        <input name="to" type="email" required defaultValue={to} className="input" />
      </div>
      <div>
        <label className="label">Subject</label>
        <input name="subject" required className="input" placeholder="New arrivals just for you 🎁" />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea name="body" required rows={4} className="input" placeholder="Hi! We just got new figures in…" />
      </div>

      {state?.message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Sending…" : "Send email"}
      </button>
    </form>
  );
}
