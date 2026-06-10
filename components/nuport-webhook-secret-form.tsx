"use client";

import { useActionState } from "react";
import { saveWebhookSecret } from "@/app/nuport-actions";

export default function NuportWebhookSecretForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(saveWebhookSecret, undefined);

  return (
    <form action={action} className="flex gap-2">
      <input
        name="webhookSecret"
        type="text"
        defaultValue={current}
        placeholder="e.g. my-secret-token-123"
        className="input flex-1 text-sm font-mono"
        autoComplete="off"
      />
      <button type="submit" disabled={pending} className="btn-secondary text-sm whitespace-nowrap">
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.ok && (
        <span className="self-center text-xs text-green-600">✅ Saved</span>
      )}
    </form>
  );
}
