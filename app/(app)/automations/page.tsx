import { prisma } from "@/lib/db";
import { toggleWorkflow, deleteWorkflow, runAutomationsNow } from "@/app/followup-actions";
import WorkflowForm from "@/components/workflow-form";
import { STAGE_LABEL, type StageKey } from "@/lib/labels";

function triggerText(w: { trigger: string; triggerStage: string | null; daysBefore: number | null; inactivityDays: number | null }): string {
  switch (w.trigger) {
    case "CUSTOMER_CREATED": return "When a new customer is added";
    case "STAGE_CHANGED": return w.triggerStage ? `When moved to ${STAGE_LABEL[w.triggerStage as StageKey]}` : "When stage changes (any)";
    case "BIRTHDAY_SOON": return `${w.daysBefore ?? 3} days before birthday`;
    case "NO_CONTACT": return `After ${w.inactivityDays ?? 30} days with no contact`;
    default: return w.trigger;
  }
}

const isTimeTrigger = (t: string) => t === "BIRTHDAY_SOON" || t === "NO_CONTACT";

export default async function AutomationsPage() {
  const [workflows, sequences] = await Promise.all([
    prisma.workflow.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.sequence.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { steps: true } } } }),
  ]);
  const seqName = new Map(sequences.map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Automations</h1>
          <p className="text-sm text-brand-700/70">
            Set rules once — Marshmallow runs them for you. &ldquo;When this happens, do that.&rdquo;
          </p>
        </div>
        <form action={runAutomationsNow}>
          <button type="submit" className="btn-secondary">⚡ Run time-based now</button>
        </form>
      </div>

      <div className="rounded-lg bg-brand-100/50 p-4 text-sm text-brand-800">
        💡 Event rules (new customer, stage change) fire instantly. Time rules (birthday, no-contact)
        run automatically once a day when the app is opened — or hit <strong>Run time-based now</strong>.
      </div>

      <div className="space-y-3">
        {workflows.length === 0 ? (
          <div className="card p-8 text-center text-brand-700/60">No automations yet. Create one below.</div>
        ) : (
          workflows.map((w) => {
            const toggle = toggleWorkflow.bind(null, w.id, !w.active);
            const del = deleteWorkflow.bind(null, w.id);
            const actionText = w.action === "ENROLL_SEQUENCE"
              ? `Enroll in "${seqName.get(w.actionSequenceId ?? "") ?? "sequence"}"`
              : `Create task: "${w.taskTitle ?? ""}"`;
            return (
              <div key={w.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-900">{w.name}</span>
                      {!w.active && <span className="badge bg-gray-100 text-gray-500">paused</span>}
                      {isTimeTrigger(w.trigger) && (
                        <span className="badge bg-amber-100 text-amber-700">scheduled</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-brand-700/80">
                      <span className="text-brand-700/60">When:</span> {triggerText(w)}
                    </p>
                    <p className="text-sm text-brand-700/80">
                      <span className="text-brand-700/60">Then:</span> {actionText}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <form action={toggle}>
                      <button type="submit" className="text-sm text-brand-700 hover:underline">
                        {w.active ? "Pause" : "Activate"}
                      </button>
                    </form>
                    <form action={del}>
                      <button type="submit" className="text-sm text-red-600 hover:underline">Delete</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">New automation</h2>
        <WorkflowForm sequences={sequences.map((s) => ({ id: s.id, name: s.name, steps: s._count.steps }))} />
      </div>
    </div>
  );
}
