"use client";

import { useActionState } from "react";
import { saveGmbSettings } from "@/app/nuport-actions";

export default function GmbReviewForm({
  reviewUrl,
  messageTemplate,
}: {
  reviewUrl: string | null;
  messageTemplate: string | null;
}) {
  const [state, action, pending] = useActionState(saveGmbSettings, undefined);

  const defaultMsg =
    messageTemplate ??
    "Hi {name}, thank you for your purchase! We'd love your feedback — please leave us a quick Google review: {url} 🙏";

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved!</p>
      )}

      <label className="block">
        <span className="label">Google review link *</span>
        <input
          name="reviewUrl"
          type="url"
          required
          defaultValue={reviewUrl ?? ""}
          className="input"
          placeholder="https://g.page/r/YOUR_PLACE_ID/review"
        />
        <p className="mt-1 text-xs text-brand-700/50">
          Find it in Google Business Profile → Get more reviews → Copy link.
        </p>
      </label>

      <label className="block">
        <span className="label">SMS message</span>
        <textarea
          name="messageTemplate"
          defaultValue={defaultMsg}
          className="input min-h-[90px]"
        />
        <p className="mt-1 text-xs text-brand-700/50">
          Use <code className="rounded bg-brand-50 px-1">{"{name}"}</code> for the customer name and{" "}
          <code className="rounded bg-brand-50 px-1">{"{url}"}</code> for the review link.
        </p>
      </label>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
