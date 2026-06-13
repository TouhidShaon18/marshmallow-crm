"use client";

import { useId, useState } from "react";
import type { LineItem } from "@/lib/finance";

type Props = {
  // form field prefix → inputs are named `${prefix}Label` and `${prefix}Amount`
  prefix: string;
  heading: string;
  suggestions: readonly string[];
  initial: LineItem[];
};

let rowSeq = 0;
const newRow = (label = "", amount = ""): Row => ({ key: `r${rowSeq++}`, label, amount });
type Row = { key: string; label: string; amount: string };

export default function BreakdownField({ prefix, heading, suggestions, initial }: Props) {
  const listId = useId();
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map((it) => newRow(it.label, String(it.amount)))
      : [newRow()],
  );

  const subtotal = rows.reduce((t, r) => t + (parseFloat(r.amount) || 0), 0);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow()]));
  const add = () => setRows((rs) => [...rs, newRow()]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="section-heading">{heading}</h2>
        <span className="text-xs font-semibold text-brand-600">
          Subtotal: ৳{subtotal.toLocaleString("en-BD")}
        </span>
      </div>

      <datalist id={listId}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <input
              name={`${prefix}Label`}
              list={listId}
              value={r.label}
              onChange={(e) => update(r.key, { label: e.target.value })}
              placeholder="Type (e.g. Facebook Ads)"
              className="input flex-1"
            />
            <input
              name={`${prefix}Amount`}
              type="number"
              min={0}
              step={0.01}
              value={r.amount}
              onChange={(e) => update(r.key, { amount: e.target.value })}
              placeholder="৳ Amount"
              className="input w-32"
            />
            <button
              type="button"
              onClick={() => remove(r.key)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-400 hover:bg-red-50 hover:text-red-500"
              aria-label="Remove row"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        + Add {heading.toLowerCase()} item
      </button>
    </section>
  );
}
