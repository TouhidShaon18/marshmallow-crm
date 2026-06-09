"use client";

import { useActionState } from "react";
import { createTag } from "@/app/tag-actions";
import { TAG_COLOR_KEYS } from "@/components/tag-badge";

export default function CreateTagForm() {
  const [state, action, pending] = useActionState(createTag, undefined);

  return (
    <form action={action} className="flex flex-wrap gap-3">
      <input
        name="name"
        required
        placeholder="e.g. VIP, Hot Lead, Naruto Fan…"
        className="input flex-1 min-w-[180px]"
      />
      <select name="color" className="input w-36">
        {TAG_COLOR_KEYS.map((c) => (
          <option key={c} value={c}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "+ Create tag"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
