"use client";

import { useActionState } from "react";
import { saveWooSettings, syncWooNow } from "@/app/affiliate-actions";

export default function WooSettingsForm({
  storeUrl,
  hasKey,
  maskedKey,
  enabled,
}: {
  storeUrl: string | null;
  hasKey: boolean;
  maskedKey: string | null;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveWooSettings, undefined);
  const [syncState, sync, syncing] = useActionState(syncWooNow, undefined);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved!</p>}

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-900">Enable daily auto-sync</p>
            <p className="text-xs text-brand-700/50">Pulls completed orders that used a creator coupon, once a day</p>
          </div>
          <input type="checkbox" name="enabled" value="true" defaultChecked={enabled} className="h-5 w-5 accent-brand-600" />
        </label>

        <label className="block">
          <span className="label">Store URL</span>
          <input name="storeUrl" type="url" defaultValue={storeUrl ?? ""} className="input" placeholder="https://marshmallow-tech.com" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Consumer key</span>
            <input name="consumerKey" type="password" autoComplete="off" className="input"
              placeholder={hasKey ? `saved (${maskedKey})` : "ck_..."} />
          </label>
          <label className="block">
            <span className="label">Consumer secret</span>
            <input name="consumerSecret" type="password" autoComplete="off" className="input"
              placeholder={hasKey ? "saved — leave blank to keep" : "cs_..."} />
          </label>
        </div>
        <p className="text-xs text-brand-700/50">
          Leave key/secret blank to keep the saved values. Use <strong>Read</strong>-only permissions.
        </p>

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      {/* Manual sync */}
      <form action={sync} className="flex items-center gap-3 border-t border-brand-100 pt-4">
        <button type="submit" disabled={syncing} className="btn-secondary">
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        {syncState && (
          <span className={`text-sm ${syncState.ok ? "text-green-700" : "text-red-600"}`}>
            {syncState.message}
            {syncState.ok && typeof syncState.skippedNoCoupon === "number" && syncState.skippedNoCoupon > 0 &&
              ` (${syncState.skippedNoCoupon} order(s) had no creator coupon)`}
          </span>
        )}
      </form>
    </div>
  );
}
