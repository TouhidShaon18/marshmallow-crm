"use client";

import { useActionState } from "react";
import { saveNuportApiKey } from "@/app/nuport-actions";

export default function NuportSettingsForm() {
  const [state, action, pending] = useActionState(saveNuportApiKey, undefined);

  return (
    <form action={action} className="space-y-3">
      <input
        name="apiKey"
        type="password"
        placeholder="Paste your Nuport API key here"
        className="input font-mono text-sm"
        required
        autoComplete="off"
      />

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          ✅ API key saved and verified! The hourly sync is now active.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Verifying…" : "Save & verify"}
      </button>
    </form>
  );
}
