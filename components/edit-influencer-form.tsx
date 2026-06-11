"use client";

import { useActionState } from "react";
import { updateInfluencer } from "@/app/influencer-actions";

const PLATFORMS = [
  { value: "INSTAGRAM", label: "📸 Instagram" },
  { value: "TIKTOK",    label: "🎵 TikTok" },
  { value: "YOUTUBE",   label: "▶️ YouTube" },
  { value: "FACEBOOK",  label: "👍 Facebook" },
  { value: "TWITTER",   label: "🐦 Twitter / X" },
  { value: "BLOG",      label: "✍️ Blog" },
  { value: "OTHER",     label: "🌐 Other" },
];

type Influencer = {
  id: string;
  name: string;
  socialHandle: string;
  platform: string;
  followerCount: number | null;
  email: string | null;
  phone: string | null;
  niche: string | null;
  notes: string | null;
};

export default function EditInfluencerForm({ influencer }: { influencer: Influencer }) {
  const [state, action, pending] = useActionState(updateInfluencer, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved!</p>
      )}

      <input type="hidden" name="id" value={influencer.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name *</span>
          <input name="name" required defaultValue={influencer.name} className="input" />
        </label>
        <label className="block">
          <span className="label">Social handle *</span>
          <input name="socialHandle" required defaultValue={influencer.socialHandle} className="input" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Platform</span>
          <select name="platform" defaultValue={influencer.platform} className="input">
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Followers</span>
          <input
            name="followerCount"
            type="number"
            min="0"
            defaultValue={influencer.followerCount ?? ""}
            className="input"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" defaultValue={influencer.email ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input name="phone" defaultValue={influencer.phone ?? ""} className="input" />
        </label>
      </div>

      <label className="block">
        <span className="label">Niche / category</span>
        <input name="niche" defaultValue={influencer.niche ?? ""} className="input" />
      </label>

      <label className="block">
        <span className="label">Notes</span>
        <textarea name="notes" defaultValue={influencer.notes ?? ""} className="input min-h-[80px]" />
      </label>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Update profile"}
      </button>
    </form>
  );
}
