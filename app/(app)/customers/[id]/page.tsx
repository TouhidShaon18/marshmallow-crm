import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteCustomer } from "@/app/actions";
import { enrollCustomer, cancelEnrollment } from "@/app/followup-actions";
import WhatsAppButton from "@/components/whatsapp-button";
import NoteForm from "@/components/note-form";
import EmailComposer from "@/components/email-composer";
import CustomerInsight, { CustomerInsightSkeleton } from "@/components/customer-insight";
import CustomerTags from "@/components/customer-tags";
import { STAGE_LABEL, STAGE_COLOR, CHANNEL_ICON, type StageKey, type ChannelKey } from "@/lib/labels";

const typeStyle: Record<string, string> = {
  WHATSAPP: "bg-green-100 text-green-700",
  EMAIL: "bg-sky-100 text-sky-700",
  CALL: "bg-amber-100 text-amber-700",
  NOTE: "bg-brand-100 text-brand-700",
};

function fmt(d: Date) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-brand-700/60">{label}</dt>
      <dd className="text-sm text-brand-900">{value || "—"}</dd>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, activeSequences, allTags] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { name: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: { employee: { select: { name: true } } },
        },
        enrollments: {
          orderBy: { startedAt: "desc" },
          include: { sequence: { select: { name: true } } },
        },
        tasks: {
          where: { status: "PENDING" },
          orderBy: { dueAt: "asc" },
        },
        tags: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.sequence.findMany({
      where: { active: true },
      select: { id: true, name: true, _count: { select: { steps: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);
  if (!customer) notFound();

  const delAction = deleteCustomer.bind(null, id);
  const enrollableSequences = activeSequences.filter((s) => s._count.steps > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-brand-700/70 hover:underline">
            ← Back to customers
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-brand-900">
            {customer.name}
            <span className={`badge ${STAGE_COLOR[customer.stage as StageKey]}`}>
              {STAGE_LABEL[customer.stage as StageKey]}
            </span>
            {customer.repeatCustomer && (
              <span className="badge bg-amber-100 text-amber-700">repeat customer</span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <WhatsAppButton number={customer.whatsappNumber} name={customer.name} />
          <Link href={`/customers/${id}/edit`} className="btn-secondary">Edit</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: details + actions */}
        <div className="space-y-6 lg:col-span-1">
          <Suspense fallback={<CustomerInsightSkeleton />}>
            <CustomerInsight customerId={id} />
          </Suspense>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Tags</h2>
            <CustomerTags
              customerId={id}
              customerTags={customer.tags}
              allTags={allTags}
            />
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="WhatsApp" value={customer.whatsappNumber} />
              <Detail label="Email" value={customer.email} />
              <Detail label="Favourite anime" value={customer.favouriteAnime} />
              <Detail label="Channel" value={customer.channel === "ONLINE" ? "Online" : "Offline"} />
              <Detail label="Product bought" value={customer.productBought} />
              <Detail label="Order amount" value={customer.orderAmount != null ? `৳${customer.orderAmount}` : null} />
              <Detail label="Gift received" value={customer.giftReceived} />
              <Detail label="Birthday" value={customer.birthday ? new Date(customer.birthday).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null} />
              <Detail label="Assigned to" value={customer.assignedTo?.name} />
              <Detail label="Last contacted" value={customer.lastContactedAt ? fmt(customer.lastContactedAt) : "Never"} />
              <div className="col-span-2">
                <Detail label="Address" value={customer.address} />
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Send email</h2>
            <EmailComposer customerId={id} to={customer.email} />
          </div>

          <form action={delAction}>
            <button type="submit" className="btn-ghost text-red-600 hover:bg-red-50">
              Delete customer
            </button>
          </form>
        </div>

        {/* Right column: automation + log + timeline */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Follow-up automation</h2>

            {/* Enroll in a sequence */}
            {enrollableSequences.length > 0 ? (
              <form action={enrollCustomer} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="customerId" value={id} />
                <div className="flex-1 min-w-[180px]">
                  <label className="label" htmlFor="sequenceId">Enroll in sequence</label>
                  <select id="sequenceId" name="sequenceId" className="input" defaultValue="">
                    <option value="" disabled>Choose a sequence…</option>
                    {enrollableSequences.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s._count.steps} steps)</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary">Enroll</button>
              </form>
            ) : (
              <p className="text-sm text-brand-700/60">
                No active sequences with steps yet. <Link href="/sequences" className="text-brand-700 underline">Create one →</Link>
              </p>
            )}

            {/* Active enrollments */}
            {customer.enrollments.filter((e) => e.status === "ACTIVE").length > 0 && (
              <div className="mt-4 space-y-2">
                {customer.enrollments
                  .filter((e) => e.status === "ACTIVE")
                  .map((e) => {
                    const cancel = cancelEnrollment.bind(null, e.id, id);
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
                        <span className="text-brand-900">📨 {e.sequence.name}</span>
                        <form action={cancel}>
                          <button type="submit" className="text-xs text-red-600 hover:underline">Cancel</button>
                        </form>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Pending tasks for this customer */}
            {customer.tasks.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700/60">Upcoming tasks</p>
                <ul className="space-y-1">
                  {customer.tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-900">
                        {CHANNEL_ICON[t.channel as ChannelKey]} {t.title}
                      </span>
                      <span className="text-xs text-brand-700/60">
                        {new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/tasks" className="mt-2 inline-block text-xs text-brand-700 underline">Go to Today →</Link>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Log a conversation</h2>
            <NoteForm customerId={id} />
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
              Timeline ({customer.interactions.length})
            </h2>
            {customer.interactions.length === 0 ? (
              <p className="text-sm text-brand-700/60">No conversations logged yet.</p>
            ) : (
              <ol className="space-y-4">
                {customer.interactions.map((it) => (
                  <li key={it.id} className="border-l-2 border-brand-200 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${typeStyle[it.type]}`}>{it.type.toLowerCase()}</span>
                      <span className="text-xs text-brand-700/60">
                        {fmt(it.createdAt)} · {it.employee?.name ?? "Unknown"}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-brand-900">{it.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
