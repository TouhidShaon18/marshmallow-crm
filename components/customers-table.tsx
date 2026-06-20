"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TagBadge from "@/components/tag-badge";
import { getRank } from "@/lib/loyalty";
import { bulkDeleteCustomers } from "@/app/actions";

export type CustomerRow = {
  id: string;
  name: string;
  favouriteAnime: string | null;
  productBought: string | null;
  channel: "ONLINE" | "OFFLINE";
  repeatCustomer: boolean;
  stampCount: number;
  lastContactedAt: string | Date | null;
  assignedTo: { name: string } | null;
  tags: { id: string; name: string; color: string }[];
};

function daysSince(d: string | Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

export default function CustomersTable({
  customers,
  canBulkDelete,
}: {
  customers: CustomerRow[];
  canBulkDelete: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = customers.length > 0 && selected.size === customers.length;
  const someSelected = selected.size > 0;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)));

  const handleDelete = () => {
    if (selected.size === 0) return;
    const n = selected.size;
    if (!confirm(`Permanently delete ${n} customer${n === 1 ? "" : "s"}? This also removes their notes, tasks, and history. This cannot be undone.`)) return;
    const ids = [...selected];
    startTransition(async () => {
      const res = await bulkDeleteCustomers(ids);
      setSelected(new Set());
      router.refresh();
      if (!res.ok && res.error) alert(res.error);
    });
  };

  return (
    <div className="space-y-3">
      {/* Selection action bar */}
      {canBulkDelete && someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="btn-ghost text-sm"
              disabled={pending}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Deleting…" : `🗑 Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-10 text-center text-brand-700/60">No customers match your filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700/70">
              <tr>
                {canBulkDelete && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-brand-600"
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Anime</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 hidden sm:table-cell">Channel</th>
                <th className="px-4 py-3 hidden md:table-cell">Assigned</th>
                <th className="px-4 py-3">Last contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {customers.map((c) => {
                const since = daysSince(c.lastContactedAt);
                const overdue = since == null || since >= 7;
                const checked = selected.has(c.id);
                return (
                  <tr key={c.id} className={`hover:bg-brand-50/50 ${checked ? "bg-brand-50" : ""}`}>
                    {canBulkDelete && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(c.id)}
                          className="h-4 w-4 accent-brand-600"
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.repeatCustomer && <span className="badge ml-2 bg-amber-100 text-amber-700">repeat</span>}
                      {c.stampCount > 0 && (
                        <span className="badge ml-2 bg-purple-100 text-purple-700">
                          {getRank(c.stampCount).icon} {getRank(c.stampCount).name}
                        </span>
                      )}
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <TagBadge key={t.id} name={t.name} color={t.color} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{c.favouriteAnime ?? "—"}</td>
                    <td className="px-4 py-3">{c.productBought ?? "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`badge ${c.channel === "ONLINE" ? "bg-sky-100 text-sky-700" : "bg-brand-100 text-brand-700"}`}>
                        {c.channel === "ONLINE" ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{c.assignedTo?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {since == null ? (
                        <span className="text-red-600">Never</span>
                      ) : (
                        <span className={overdue ? "text-red-600 font-medium" : "text-brand-700/70"}>
                          {since === 0 ? "Today" : `${since}d ago`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
