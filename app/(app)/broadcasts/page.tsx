import Link from "next/link";
import { prisma } from "@/lib/db";

const channelBadge: Record<string, string> = {
  SMS: "bg-sky-100 text-sky-700",
  EMAIL: "bg-brand-100 text-brand-700",
};
const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
};

export default async function BroadcastsPage() {
  const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Promotions</h1>
          <p className="text-sm text-brand-700/70">
            Bulk SMS &amp; Email campaigns (1-to-many). Plan here, export the list, send from your bulk tool.
          </p>
        </div>
        <Link href="/broadcasts/new" className="btn-primary">+ New promotion</Link>
      </div>

      <div className="rounded-lg bg-brand-100/50 p-4 text-sm text-brand-800">
        💡 WhatsApp is your personal 1-to-1 channel (on each customer). <strong>SMS and Email here are
        for promotions only</strong> — Marshmallow doesn&apos;t send them directly; it builds your
        recipient list + personalised messages to export.
      </div>

      <div className="space-y-3">
        {broadcasts.length === 0 ? (
          <div className="card p-8 text-center text-brand-700/60">No promotions yet. Create your first.</div>
        ) : (
          broadcasts.map((b) => (
            <Link key={b.id} href={`/broadcasts/${b.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-brand-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${channelBadge[b.channel]}`}>{b.channel}</span>
                  <span className="font-semibold text-brand-900">{b.name}</span>
                  <span className={`badge ${statusBadge[b.status]}`}>{b.status.toLowerCase()}</span>
                </div>
                <p className="mt-0.5 text-sm text-brand-700/60">
                  {b.recipientCount} recipient{b.recipientCount === 1 ? "" : "s"}
                  {b.sentAt ? ` · sent ${new Date(b.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
