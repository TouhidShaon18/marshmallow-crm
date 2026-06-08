"use client";

import { useActionState } from "react";
import { createSequence } from "@/app/followup-actions";

export default function SequenceCreateForm() {
  const [state, action, pending] = useActionState(createSequence, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Sequence name</label>
        <input id="name" name="name" required className="input" placeholder="e.g. New Customer Welcome" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description (optional)</label>
        <input id="description" name="description" className="input" placeholder="What is this sequence for?" />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create sequence"}
      </button>
    </form>
  );
}
