"use client";

import Link from "next/link";
import { completeTask, skipTask, snoozeTask } from "@/app/followup-actions";
import { CHANNEL_ICON, CHANNEL_LABEL, type ChannelKey } from "@/lib/labels";

export type TaskCardData = {
  id: string;
  title: string;
  message: string | null;
  channel: ChannelKey;
  dueAt: string; // ISO
  customer: { id: string; name: string; whatsappNumber: string | null; email: string | null };
  assignedTo: string | null;
};

function dueLabel(iso: string): { text: string; overdue: boolean } {
  const due = new Date(iso);
  const today = new Date();
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d1 = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((d1.getTime() - d0.getTime()) / 86_400_000);
  if (diff < 0) return { text: `${-diff}d overdue`, overdue: true };
  if (diff === 0) return { text: "Due today", overdue: false };
  if (diff === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `In ${diff} days`, overdue: false };
}

export default function TaskCard({ task }: { task: TaskCardData }) {
  const due = dueLabel(task.dueAt);
  const complete = completeTask.bind(null, task.id);
  const skip = skipTask.bind(null, task.id);
  const snooze1 = snoozeTask.bind(null, task.id, 1);
  const snooze3 = snoozeTask.bind(null, task.id, 3);

  const digits = task.customer.whatsappNumber?.replace(/[^0-9]/g, "");
  const waUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(task.message ?? "")}`
    : null;
  const mailUrl = task.customer.email
    ? `mailto:${task.customer.email}?subject=${encodeURIComponent(task.title)}&body=${encodeURIComponent(task.message ?? "")}`
    : null;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{CHANNEL_ICON[task.channel]}</span>
            <span className="font-semibold text-brand-900">{task.title}</span>
          </div>
          <p className="mt-0.5 text-sm text-brand-700/70">
            <Link href={`/customers/${task.customer.id}`} className="text-brand-700 hover:underline">
              {task.customer.name}
            </Link>
            {task.assignedTo ? ` · ${task.assignedTo}` : ""}
            {" · "}{CHANNEL_LABEL[task.channel]}
          </p>
        </div>
        <span className={`badge ${due.overdue ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"}`}>
          {due.text}
        </span>
      </div>

      {task.message && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
          {task.message}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {task.channel === "WHATSAPP" && waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-primary bg-green-600 hover:bg-green-700">
            💬 Open WhatsApp
          </a>
        )}
        {task.channel === "EMAIL" && mailUrl && (
          <a href={mailUrl} className="btn-secondary">📧 Open email</a>
        )}
        {task.channel === "CALL" && task.customer.whatsappNumber && (
          <a href={`tel:${task.customer.whatsappNumber}`} className="btn-secondary">📞 Call</a>
        )}

        <form action={complete}>
          <button type="submit" className="btn-primary">✓ Done</button>
        </form>
        <form action={snooze1}>
          <button type="submit" className="btn-ghost">Snooze 1d</button>
        </form>
        <form action={snooze3}>
          <button type="submit" className="btn-ghost">Snooze 3d</button>
        </form>
        <form action={skip}>
          <button type="submit" className="btn-ghost text-red-600 hover:bg-red-50">Skip</button>
        </form>
      </div>
    </div>
  );
}
