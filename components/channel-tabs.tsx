"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import SocialPostCard from "@/components/social-post-card";
import { CHANNEL_CONFIG, ALL_CHANNELS } from "@/lib/social";
import type { SocialChannelKey } from "@/lib/social";

type Post = ComponentProps<typeof SocialPostCard>["post"];

export default function ChannelTabs({ posts, canDelete }: { posts: Post[]; canDelete: boolean }) {
  const counts: Record<string, number> = {};
  for (const p of posts) counts[p.channel] = (counts[p.channel] ?? 0) + 1;
  const channels = ALL_CHANNELS.filter((ch) => counts[ch]);

  const [sel, setSel] = useState<SocialChannelKey | "ALL">("ALL");
  const shown = sel === "ALL" ? posts : posts.filter((p) => p.channel === sel);

  return (
    <div className="space-y-4">
      {/* Channel filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSel("ALL")}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${
            sel === "ALL" ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
          }`}
        >
          All <span className="ml-0.5 rounded-full bg-white/30 px-1.5 font-bold">{posts.length}</span>
        </button>
        {channels.map((ch) => {
          const cfg = CHANNEL_CONFIG[ch];
          const active = sel === ch;
          return (
            <button
              type="button"
              key={ch}
              onClick={() => setSel(ch)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition ${cfg.color} ${
                active ? "ring-2 ring-brand-500 ring-offset-1" : "opacity-60 hover:opacity-100"
              }`}
            >
              {cfg.icon} {cfg.label}
              <span className="ml-0.5 rounded-full bg-white/60 px-1.5 font-bold">{counts[ch]}</span>
            </button>
          );
        })}
      </div>

      {/* Filtered posts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <SocialPostCard key={p.id} post={p} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}
