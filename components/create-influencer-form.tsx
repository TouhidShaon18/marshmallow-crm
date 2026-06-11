"use client";

import { useActionState } from "react";
import { createInfluencer } from "@/app/influencer-actions";

const PLATFORMS = [
  { value: "INSTAGRAM", label: "📸 Instagram" },
  { value: "TIKTOK",    label: "🎵 TikTok" },
  { value: "YOUTUBE",   label: "▶️ YouTube" },
  { value: "FACEBOOK",  label: "👍 Facebook" },
  { value: "TWITTER",   label: "🐦 Twitter / X" },
  { value: "BLOG",      label: "✍️ Blog" },
  { value: "OTHER",     label: "🌐 Other" },
];

export default function CreateInfluencerForm() {
  const [state, action, pending] = useActionState(createInfluencer, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name *</span>
          <input name="name" required className="input" placeholder="e.g. Sakura Tanaka" />
        </label>
        <label className="block">
          <span className="label">Social handle *</span>
          <input name="socialHandle" required className="input" placeholder="@username or channel name" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Platform *</span>
          <select name="platform" defaultValue="INSTAGRAM" className="input">
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Followers</span>
          <input name="followerCount" type="number" min="0" className="input" placeholder="e.g. 50000" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" className="input" placeholder="influencer@email.com" />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input name="phone" className="input" placeholder="+880 …" />
        </label>
      </div>

      <label className="block">
        <span className="label">Niche / category</span>
        <input name="niche" className="input" placeholder="e.g. anime, fashion, tech, gaming" />
      </label>

      <label className="block">
        <span className="label">Notes</span>
        <textarea name="notes" className="input min-h-[80px]" placeholder="Any additional notes…" />
      </label>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save influencer"}
      </button>
    </form>
  );
}
