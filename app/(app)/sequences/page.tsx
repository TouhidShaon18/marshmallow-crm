import Link from "next/link";
import { prisma } from "@/lib/db";
import SequenceCreateForm from "@/components/sequence-create-form";

export default async function SequencesPage() {
  const sequences = await prisma.sequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Follow-up sequences</h1>
        <p className="text-sm text-brand-700/70">
          Build a series of timed steps once, then enroll customers to auto-generate their follow-up tasks.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700/70">New sequence</h2>
        <SequenceCreateForm />
      </div>

      <div className="space-y-3">
        {sequences.length === 0 ? (
          <div className="card p-8 text-center text-brand-700/60">No sequences yet. Create your first above.</div>
        ) : (
          sequences.map((s) => (
            <Link key={s.id} href={`/sequences/${s.id}`} className="card flex items-center justify-between p-4 hover:bg-brand-50/50">
              <div>
                <p className="font-semibold text-brand-900">
                  {s.name}
                  {!s.active && <span className="badge ml-2 bg-gray-100 text-gray-500">paused</span>}
                </p>
                {s.description && <p className="text-sm text-brand-700/60">{s.description}</p>}
              </div>
              <span className="text-sm text-brand-700/60">
                {s._count.steps} step{s._count.steps === 1 ? "" : "s"} · {s._count.enrollments} enrolled
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
