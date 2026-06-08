import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  addSequenceStep,
  deleteSequenceStep,
  deleteSequence,
  toggleSequenceActive,
} from "@/app/followup-actions";
import { CHANNEL_ICON, CHANNEL_LABEL, type ChannelKey } from "@/lib/labels";

export default async function SequenceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!sequence) notFound();

  const toggle = toggleSequenceActive.bind(null, id, !sequence.active);
  const del = deleteSequence.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/sequences" className="text-sm text-brand-700/70 hover:underline">← All sequences</Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-brand-900">
            {sequence.name}
            {!sequence.active && <span className="badge bg-gray-100 text-gray-500">paused</span>}
          </h1>
          {sequence.description && <p className="text-sm text-brand-700/70">{sequence.description}</p>}
        </div>
        <div className="flex gap-2">
          <form action={toggle}>
            <button type="submit" className="btn-secondary">{sequence.active ? "Pause" : "Activate"}</button>
          </form>
          <form action={del}>
            <button type="submit" className="btn-ghost text-red-600 hover:bg-red-50">Delete</button>
          </form>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {sequence.steps.length === 0 ? (
          <div className="card p-6 text-center text-brand-700/60">No steps yet. Add the first below.</div>
        ) : (
          sequence.steps.map((step) => {
            const delStep = deleteSequenceStep.bind(null, step.id, id);
            return (
              <div key={step.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-brand-100 text-brand-700">
                        Day {step.dayOffset}
                      </span>
                      <span className="text-sm">{CHANNEL_ICON[step.channel as ChannelKey]}</span>
                      <span className="font-semibold text-brand-900">{step.title}</span>
                    </div>
                    {step.message && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
                        {step.message}
                      </p>
                    )}
                  </div>
                  <form action={delStep}>
                    <button type="submit" className="text-sm text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add step */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Add a step</h2>
        <form action={addSequenceStep} className="space-y-4">
          <input type="hidden" name="sequenceId" value={id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dayOffset">Day (after enroll)</label>
              <input id="dayOffset" name="dayOffset" type="number" min="0" defaultValue={0} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="channel">Channel</label>
              <select id="channel" name="channel" className="input" defaultValue="WHATSAPP">
                {(["WHATSAPP", "EMAIL", "CALL", "TASK"] as ChannelKey[]).map((c) => (
                  <option key={c} value={c}>{CHANNEL_ICON[c]} {CHANNEL_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="title">Step title</label>
              <input id="title" name="title" required className="input" placeholder="Welcome message" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="message">Message template</label>
            <textarea id="message" name="message" rows={3} className="input" placeholder="Hi {name}! Thanks for shopping with us. Loved the {product}? We have more {anime} goodies coming 🎁" />
            <p className="mt-1 text-xs text-brand-700/60">
              Use <code>{"{name}"}</code>, <code>{"{anime}"}</code>, <code>{"{product}"}</code>, <code>{"{gift}"}</code> — they get filled in per customer when enrolled.
            </p>
          </div>
          <button type="submit" className="btn-primary">Add step</button>
        </form>
      </div>
    </div>
  );
}
