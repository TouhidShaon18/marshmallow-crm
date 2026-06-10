"use client";

import { useState, useActionState } from "react";
import { markPosted, logMetrics, deletePost } from "@/app/social-actions";
import { CHANNEL_CONFIG } from "@/lib/social";
import type { SocialChannelKey } from "@/lib/social";
import DeleteButton from "@/components/delete-button";

type Post = {
  id: string;
  channel: SocialChannelKey;
  topic: string;
  notes: string | null;
  scheduledDate: Date;
  assignedTo: { name: string } | null;
  status: "PLANNED" | "POSTED" | "METRICS_LOGGED";
  postedAt: Date | null;
  postUrl: string | null;
  reactCount: number | null;
  viewCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  metricsReminderSentAt: Date | null;
};

function MarkPostedForm({ postId, scheduledDate }: { postId: string; scheduledDate: Date }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(markPosted, undefined);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-xs">
        ✓ Mark as posted
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
      <input type="hidden" name="postId" value={postId} />
      <div>
        <label className="label text-xs">Post URL *</label>
        <input name="postUrl" required className="input text-sm" placeholder="https://..." />
      </div>
      <div>
        <label className="label text-xs">Posted at</label>
        <input
          name="postedAt"
          type="datetime-local"
          className="input text-sm"
          defaultValue={new Date(scheduledDate).toISOString().slice(0, 16)}
        />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-xs">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
      </div>
    </form>
  );
}

function LogMetricsForm({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(logMetrics, undefined);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-xs bg-amber-500 hover:bg-amber-600">
        📊 Log metrics
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <input type="hidden" name="postId" value={postId} />
      <p className="text-xs font-semibold text-amber-700">Enter performance numbers</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "viewCount",    label: "👁️ Views"     },
          { name: "reactCount",   label: "❤️ Reactions" },
          { name: "commentCount", label: "💬 Comments"  },
          { name: "shareCount",   label: "🔁 Shares"    },
        ].map((f) => (
          <div key={f.name}>
            <label className="label text-xs">{f.label}</label>
            <input name={f.name} type="number" min="0" className="input text-sm" placeholder="0" />
          </div>
        ))}
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-xs">
          {pending ? "Saving…" : "Save metrics"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
      </div>
    </form>
  );
}

export default function SocialPostCard({ post, canDelete }: { post: Post; canDelete: boolean }) {
  const cfg = CHANNEL_CONFIG[post.channel];
  const now = new Date();
  const daysSincePost = post.postedAt
    ? (now.getTime() - new Date(post.postedAt).getTime()) / 86_400_000
    : null;
  const needsMetrics = post.status === "POSTED" && daysSincePost !== null && daysSincePost >= 3;

  const del = deletePost.bind(null, post.id); // passed to DeleteButton

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${
      needsMetrics ? "border-amber-300" : "border-brand-100"
    }`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-2">
        {/* Channel badge */}
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>

        {/* Status badge */}
        {post.status === "PLANNED" && (
          <span className="badge bg-brand-100 text-brand-700">Planned</span>
        )}
        {post.status === "POSTED" && !needsMetrics && (
          <span className="badge bg-sky-100 text-sky-700">Posted ✓</span>
        )}
        {needsMetrics && (
          <span className="badge bg-amber-100 text-amber-700 animate-pulse">⚠️ Metrics due</span>
        )}
        {post.status === "METRICS_LOGGED" && (
          <span className="badge bg-green-100 text-green-700">📊 Done</span>
        )}

        {/* Date */}
        <span className="ml-auto text-xs text-brand-700/50">
          {new Date(post.scheduledDate).toLocaleDateString("en-GB", {
            weekday: "short", day: "numeric", month: "short",
          })}
        </span>
      </div>

      {/* Topic */}
      <p className="mt-2 font-medium text-brand-900">{post.topic}</p>
      {post.notes && <p className="mt-0.5 text-xs text-brand-700/60 italic">{post.notes}</p>}

      {/* Assignee */}
      {post.assignedTo && (
        <p className="mt-1 text-xs text-brand-700/50">👤 {post.assignedTo.name}</p>
      )}

      {/* Posted info */}
      {post.postUrl && (
        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-brand-600 hover:underline"
        >
          🔗 {post.postUrl}
        </a>
      )}

      {/* Metrics summary */}
      {post.status === "METRICS_LOGGED" && (
        <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          {post.viewCount    != null && <span>👁️ {post.viewCount.toLocaleString()}</span>}
          {post.reactCount   != null && <span>❤️ {post.reactCount.toLocaleString()}</span>}
          {post.commentCount != null && <span>💬 {post.commentCount.toLocaleString()}</span>}
          {post.shareCount   != null && <span>🔁 {post.shareCount.toLocaleString()}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {post.status === "PLANNED" && (
          <MarkPostedForm postId={post.id} scheduledDate={post.scheduledDate} />
        )}
        {(post.status === "POSTED") && (
          <LogMetricsForm postId={post.id} />
        )}
        {canDelete && (
          <span className="ml-auto">
            <DeleteButton
              action={del}
              label="Delete"
              message="Delete this post from the planner?"
              className="text-xs text-red-400 hover:text-red-600"
            />
          </span>
        )}
      </div>
    </div>
  );
}
