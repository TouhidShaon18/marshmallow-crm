"use client";

import { useActionState } from "react";
import { createDeal } from "@/app/influencer-actions";

type Campaign = { id: string; name: string };

export default function AddDealForm({
  influencerId,
  campaigns,
}: {
  influencerId: string;
  campaigns: Campaign[];
}) {
  const [state, action, pending] = useActionState(createDeal, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Deal logged!</p>
      )}

      <input type="hidden" name="influencerId" value={influencerId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Deal title *</span>
          <input name="title" required className="input" placeholder="e.g. Ramadan promo reel" />
        </label>

        <label className="block">
          <span className="label">Campaign (optional)</span>
          <select name="campaignId" className="input">
            <option value="">— No campaign —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Amount paid (৳)</span>
          <input name="amountPaid" type="number" min="0" step="0.01" className="input" placeholder="e.g. 5000" />
        </label>

        <label className="block">
          <span className="label">Start date</span>
          <input name="startDate" type="date" className="input" />
        </label>
        <label className="block">
          <span className="label">End date</span>
          <input name="endDate" type="date" className="input" />
        </label>
      </div>

      <div className="rounded-lg border border-brand-100 p-4 space-y-3">
        <p className="text-sm font-medium text-brand-900">Performance metrics</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Reach / impressions</span>
            <input name="reach" type="number" min="0" className="input" placeholder="e.g. 120000" />
          </label>
          <label className="block">
            <span className="label">Interactions (likes + comments + shares)</span>
            <input name="interactions" type="number" min="0" className="input" placeholder="e.g. 3200" />
          </label>
          <label className="block">
            <span className="label">Clicks / swipe-ups</span>
            <input name="clicks" type="number" min="0" className="input" placeholder="e.g. 450" />
          </label>
          <label className="block">
            <span className="label">Conversions / sales</span>
            <input name="conversions" type="number" min="0" className="input" placeholder="e.g. 20" />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="label">Post URL</span>
        <input name="postUrl" type="url" className="input" placeholder="https://instagram.com/p/…" />
      </label>

      <label className="block">
        <span className="label">Payment notes</span>
        <input name="paymentNotes" className="input" placeholder="bKash ref, bank transfer, etc." />
      </label>

      <label className="block">
        <span className="label">Notes</span>
        <textarea name="notes" className="input min-h-[70px]" placeholder="Any extra notes…" />
      </label>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Log deal"}
      </button>
    </form>
  );
}
