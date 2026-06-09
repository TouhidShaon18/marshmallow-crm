"use client";

import { useActionState, useState } from "react";
import { createBroadcast } from "@/app/broadcast-actions";
import { STAGES, STAGE_LABEL } from "@/lib/labels";

type Tag = { id: string; name: string };

export default function BroadcastForm({ tags }: { tags: Tag[] }) {
  const [state, action, pending] = useActionState(createBroadcast, {});
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");

  return (
    <form action={action} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">Promotion</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="channel">Channel</label>
            <select
              id="channel"
              name="channel"
              className="input"
              value={channel}
              onChange={(e) => setChannel(e.target.value as "SMS" | "EMAIL")}
            >
              <option value="SMS">📱 SMS (bulk promo)</option>
              <option value="EMAIL">📧 Email (bulk promo)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="name">Campaign name</label>
            <input id="name" name="name" required className="input" placeholder="e.g. Eid Sale 25% off" />
          </div>
        </div>

        {channel === "EMAIL" && (
          <div>
            <label className="label" htmlFor="subject">Email subject</label>
            <input id="subject" name="subject" className="input" placeholder="🎁 Eid Sale — 25% off all figures!" />
          </div>
        )}

        <div>
          <label className="label" htmlFor="message">Message</label>
          <textarea id="message" name="message" required rows={5} className="input" placeholder={"Hi {name}! Big Eid sale this week — 25% off everything. Come grab your {anime} favourites! 🍡"} />
          <p className="mt-1 text-xs text-brand-700/60">
            Use <code>{"{name}"}</code>, <code>{"{anime}"}</code>, <code>{"{product}"}</code>, <code>{"{gift}"}</code> — these get personalised per recipient in the export.
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">Audience</h2>
        <p className="text-xs text-brand-700/60">
          Leave filters blank to target everyone {channel === "SMS" ? "with a phone number" : "with an email"}.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="filterStage">Stage</label>
            <select id="filterStage" name="filterStage" className="input" defaultValue="">
              <option value="">Any stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filterPurchaseChannel">Bought via</label>
            <select id="filterPurchaseChannel" name="filterPurchaseChannel" className="input" defaultValue="">
              <option value="">Online or offline</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filterAnime">Favourite anime contains</label>
            <input id="filterAnime" name="filterAnime" className="input" placeholder="e.g. Naruto" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-brand-900">
              <input type="checkbox" name="filterRepeatOnly" className="h-4 w-4 rounded border-brand-300 text-brand-600" />
              Repeat customers only
            </label>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="label" htmlFor="filterTagId">Has tag</label>
              <select id="filterTagId" name="filterTagId" className="input" defaultValue="">
                <option value="">Any tag</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create promotion"}
      </button>
    </form>
  );
}
