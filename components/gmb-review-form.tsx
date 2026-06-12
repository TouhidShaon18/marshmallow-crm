"use client";

import { useActionState } from "react";
import { saveGmbSettings } from "@/app/nuport-actions";

export default function GmbReviewForm({
  reviewUrl,
  messageTemplate,
  enabled,
}: {
  reviewUrl: string | null;
  messageTemplate: string | null;
  enabled: boolean;
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

      {/* Enable / disable toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-brand-900">Enable auto review SMS</p>
          <p className="text-xs text-brand-700/50">Turn off to pause without losing your settings</p>
        </div>
        <input
          type="checkbox"
          name="enabled"
          value="true"
          defaultChecked={enabled}
          className="h-5 w-5 accent-brand-600"
        />
      </label>

      <label className="block">
        <span className="label">Google review link</span>
        <input
          name="reviewUrl"
          type="url"
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
