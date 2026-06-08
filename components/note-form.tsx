"use client";

import { useFormStatus } from "react-dom";
import { addInteraction } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : "Log conversation"}
    </button>
  );
}

export default function NoteForm({ customerId }: { customerId: string }) {
  return (
    <form action={addInteraction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="flex flex-wrap gap-3">
        <select name="type" className="input max-w-[160px]" defaultValue="WHATSAPP">
          <option value="WHATSAPP">WhatsApp</option>
          <option value="CALL">Call</option>
          <option value="NOTE">Note</option>
        </select>
      </div>
      <textarea
        name="summary"
        required
        rows={3}
        className="input"
        placeholder="What did you talk about? e.g. Confirmed new figure arrival, customer wants to pre-order…"
      />
      <SubmitButton />
    </form>
  );
}
