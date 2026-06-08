import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { markBroadcastSent, deleteBroadcast } from "@/app/broadcast-actions";
import { audienceWhere, mergeMessage, audienceSummary } from "@/lib/audience";
import { STAGE_LABEL, type StageKey } from "@/lib/labels";

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const b = await prisma.broadcast.findUnique({ where: { id } });
  if (!b) notFound();

  const where = audienceWhere({
    channel: b.channel,
    filterStage: b.filterStage,
    filterAnime: b.filterAnime,
    filterPurchaseChannel: b.filterPurchaseChannel,
    filterRepeatOnly: b.filterRepeatOnly,
  });
  const recipients = await prisma.customer.findMany({
    where,
    select: { id: true, name: true, whatsappNumber: true, email: true, favouriteAnime: true, productBought: true, giftReceived: true },
    orderBy: { name: "asc" },
  });

  const summary = audienceSummary(
    {
      channel: b.channel,
      filterStage: b.filterStage,
      filterAnime: b.filterAnime,
      filterPurchaseChannel: b.filterPurchaseChannel,
      filterRepeatOnly: b.filterRepeatOnly,
    },
    (s) => STAGE_LABEL[s as StageKey] ?? s,
  );

  const markSent = markBroadcastSent.bind(null, id);
  const del = deleteBroadcast.bind(null, id);
  const isSMS = b.channel === "SMS";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/broadcasts" className="text-sm text-brand-700/70 hover:underline">← Back to promotions</Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-brand-900">
            {b.name}
            <span className={`badge ${isSMS ? "bg-sky-100 text-sky-700" : "bg-brand-100 text-brand-700"}`}>{b.channel}</span>
            <span className={`badge ${b.status === "SENT" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {b.status.toLowerCase()}
            </span>
          </h1>
          <p className="text-sm text-brand-700/70">Audience: {summary}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/broadcasts/${id}/export`} className="btn-secondary">⬇️ Export recipients (CSV)</a>
          <form action={del}>
            <button type="submit" className="btn-ghost text-red-600 hover:bg-red-50">Delete</button>
          </form>
        </div>
      </div>

      {/* Message preview */}
      <div className="card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700/70">Message</h2>
        {b.subject && <p className="mb-1 text-sm font-semibold text-brand-900">Subject: {b.subject}</p>}
        <p className="whitespace-pre-wrap rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{b.message}</p>
      </div>

      {/* How to send */}
      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
        📤 <strong>To send:</strong> click <em>Export recipients</em> to download the list
        ({isSMS ? "names + phone numbers" : "names + emails"} + each person&apos;s personalised message),
        upload it to your {isSMS ? "bulk SMS" : "email"} tool, send, then come back and mark it sent below.
      </div>

      {/* Mark sent */}
      {b.status !== "SENT" ? (
        <form action={markSent} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <label className="flex items-center gap-2 text-sm text-brand-900">
            <input type="checkbox" name="logToTimeline" defaultChecked className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            Log this on each recipient&apos;s timeline
          </label>
          <button type="submit" className="btn-primary">✓ Mark as sent</button>
        </form>
      ) : (
        <div className="card p-4 text-sm text-green-700">
          ✓ Sent on {b.sentAt ? new Date(b.sentAt).toLocaleString("en-GB") : ""} to {b.recipientCount} recipients.
        </div>
      )}

      {/* Recipients */}
      <div className="card overflow-hidden">
        <div className="border-b border-brand-100 px-4 py-3 text-sm font-semibold text-brand-900">
          Recipients ({recipients.length})
        </div>
        {recipients.length === 0 ? (
          <p className="p-6 text-center text-sm text-brand-700/60">
            No customers match this audience {isSMS ? "with a phone number" : "with an email"}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700/70">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">{isSMS ? "Phone" : "Email"}</th>
                <th className="px-4 py-2">Personalised message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {recipients.slice(0, 100).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-brand-900">{c.name}</td>
                  <td className="px-4 py-2 text-brand-700/80">{isSMS ? c.whatsappNumber : c.email}</td>
                  <td className="px-4 py-2 text-brand-700/70">{mergeMessage(b.message, c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {recipients.length > 100 && (
          <p className="px-4 py-2 text-xs text-brand-700/60">Showing first 100. Export for the full list.</p>
        )}
      </div>
    </div>
  );
}
