"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importCustomers, type ImportState } from "@/app/actions";

type Employee = { id: string; name: string };

export default function ImportForm({ employees }: { employees: Employee[] }) {
  const [state, action, pending] = useActionState<ImportState | undefined, FormData>(
    importCustomers,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="file">Spreadsheet file</label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".xlsx,.xls,.csv"
          className="block w-full text-sm text-brand-900 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
      </div>

      <div>
        <label className="label" htmlFor="assignedToId">Assign all of them to (optional)</label>
        <select id="assignedToId" name="assignedToId" className="input" defaultValue="">
          <option value="">— Leave unassigned —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Importing…" : "Import customers"}
      </button>

      {state?.message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          <p className="font-semibold">{state.message}</p>

          {state.ok && (
            <div className="mt-2 space-y-1 text-green-800/90">
              {typeof state.skipped === "number" && state.skipped > 0 && (
                <p>{state.skipped} row(s) were skipped.</p>
              )}
              {state.matched && state.matched.length > 0 && (
                <p className="text-xs">Matched columns: {state.matched.join(", ")}</p>
              )}
              <Link href="/customers" className="mt-2 inline-block font-semibold underline">
                View customers →
              </Link>
            </div>
          )}

          {state.errors && state.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {state.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {state.errors.length > 10 && <li>…and {state.errors.length - 10} more.</li>}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
