import { prisma } from "@/lib/db";
import TaskCard, { type TaskCardData } from "@/components/task-card";
import type { ChannelKey } from "@/lib/labels";

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function toCard(t: {
  id: string;
  title: string;
  message: string | null;
  channel: string;
  dueAt: Date;
  customer: { id: string; name: string; whatsappNumber: string | null; email: string | null };
  assignedTo: { name: string } | null;
}): TaskCardData {
  return {
    id: t.id,
    title: t.title,
    message: t.message,
    channel: t.channel as ChannelKey,
    dueAt: t.dueAt.toISOString(),
    customer: t.customer,
    assignedTo: t.assignedTo?.name ?? null,
  };
}

export default async function TasksPage() {
  const eod = endOfToday();

  const baseInclude = {
    customer: { select: { id: true, name: true, whatsappNumber: true, email: true } },
    assignedTo: { select: { name: true } },
  };

  const [dueNow, upcoming] = await Promise.all([
    prisma.task.findMany({
      where: { status: "PENDING", dueAt: { lte: eod } },
      include: baseInclude,
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { status: "PENDING", dueAt: { gt: eod } },
      include: baseInclude,
      orderBy: { dueAt: "asc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Today</h1>
        <p className="text-sm text-brand-700/70">
          Your follow-up tasks. {dueNow.length} due now, {upcoming.length} coming up.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Due now & overdue ({dueNow.length})
        </h2>
        {dueNow.length === 0 ? (
          <div className="card p-8 text-center text-brand-700/60">
            🎉 Nothing due right now. Great work!
          </div>
        ) : (
          dueNow.map((t) => <TaskCard key={t.id} task={toCard(t)} />)
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.map((t) => <TaskCard key={t.id} task={toCard(t)} />)}
        </section>
      )}
    </div>
  );
}
