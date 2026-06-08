"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createWorkflow } from "@/app/followup-actions";
import { STAGES, STAGE_LABEL, CHANNEL_ICON, CHANNEL_LABEL, type ChannelKey } from "@/lib/labels";

type Seq = { id: string; name: string; steps: number };

export default function WorkflowForm({ sequences }: { sequences: Seq[] }) {
  const [state, action, pending] = useActionState(createWorkflow, {});
  const [trigger, setTrigger] = useState("CUSTOMER_CREATED");
  const [act, setAct] = useState("ENROLL_SEQUENCE");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setTrigger("CUSTOMER_CREATED");
      setAct("ENROLL_SEQUENCE");
    }
  }, [state?.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="name">Automation name</label>
        <input id="name" name="name" required className="input" placeholder="e.g. Welcome new customers" />
      </div>

      {/* WHEN */}
      <div className="rounded-lg border border-brand-100 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700/70">When… (trigger)</p>
        <select name="trigger" className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="CUSTOMER_CREATED">A new customer is added</option>
          <option value="STAGE_CHANGED">A customer moves to a stage</option>
          <option value="BIRTHDAY_SOON">A customer's birthday is coming up</option>
          <option value="NO_CONTACT">A customer hasn't been contacted in a while</option>
        </select>

        {trigger === "STAGE_CHANGED" && (
          <div className="mt-3">
            <label className="label" htmlFor="triggerStage">Which stage?</label>
            <select id="triggerStage" name="triggerStage" className="input" defaultValue="">
              <option value="">Any stage change</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
        )}
        {trigger === "BIRTHDAY_SOON" && (
          <div className="mt-3">
            <label className="label" htmlFor="daysBefore">Days before birthday</label>
            <input id="daysBefore" name="daysBefore" type="number" min="0" defaultValue={3} className="input max-w-[140px]" />
          </div>
        )}
        {trigger === "NO_CONTACT" && (
          <div className="mt-3">
            <label className="label" htmlFor="inactivityDays">Not contacted for (days)</label>
            <input id="inactivityDays" name="inactivityDays" type="number" min="1" defaultValue={30} className="input max-w-[140px]" />
          </div>
        )}
      </div>

      {/* THEN */}
      <div className="rounded-lg border border-brand-100 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700/70">Then… (action)</p>
        <select name="action" className="input" value={act} onChange={(e) => setAct(e.target.value)}>
          <option value="ENROLL_SEQUENCE">Enroll them in a follow-up sequence</option>
          <option value="CREATE_TASK">Create a one-off reminder task</option>
        </select>

        {act === "ENROLL_SEQUENCE" ? (
          <div className="mt-3">
            <label className="label" htmlFor="actionSequenceId">Sequence</label>
            <select id="actionSequenceId" name="actionSequenceId" className="input" defaultValue="">
              <option value="" disabled>Choose a sequence…</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id} disabled={s.steps === 0}>
                  {s.name}{s.steps === 0 ? " (no steps yet)" : ` (${s.steps} steps)`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="taskChannel">Channel</label>
                <select id="taskChannel" name="taskChannel" className="input" defaultValue="WHATSAPP">
                  {(["WHATSAPP", "CALL", "TASK", "EMAIL"] as ChannelKey[]).map((c) => (
                    <option key={c} value={c}>{CHANNEL_ICON[c]} {CHANNEL_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="taskTitle">Task title</label>
                <input id="taskTitle" name="taskTitle" className="input" placeholder="🎂 Wish happy birthday" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="taskMessage">Message (optional)</label>
              <textarea id="taskMessage" name="taskMessage" rows={2} className="input" placeholder="Happy birthday {name}! 🎉 Here's 15% off as a gift." />
              <p className="mt-1 text-xs text-brand-700/60">Merge fields: {"{name} {anime} {product} {gift}"}</p>
            </div>
          </div>
        )}
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Automation created ✅</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create automation"}
      </button>
    </form>
  );
}
