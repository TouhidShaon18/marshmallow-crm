"use client";

import { useTransition } from "react";
import TagBadge from "./tag-badge";
import { addTagToCustomer, removeTagFromCustomer } from "@/app/tag-actions";

type Tag = { id: string; name: string; color: string };

type Props = {
  customerId: string;
  customerTags: Tag[];
  allTags: Tag[];
};

export default function CustomerTags({ customerId, customerTags, allTags }: Props) {
  const [pending, startTransition] = useTransition();

  const appliedIds = new Set(customerTags.map((t) => t.id));
  const available = allTags.filter((t) => !appliedIds.has(t.id));

  function add(tagId: string) {
    startTransition(() => addTagToCustomer(customerId, tagId));
  }

  function remove(tagId: string) {
    startTransition(() => removeTagFromCustomer(customerId, tagId));
  }

  return (
    <div className="space-y-3">
      {/* Applied tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {customerTags.length === 0 ? (
          <span className="text-xs text-brand-700/50">No tags yet.</span>
        ) : (
          customerTags.map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} onRemove={() => remove(t.id)} />
          ))
        )}
      </div>

      {/* Add tag dropdown */}
      {available.length > 0 && (
        <select
          className="input text-sm"
          value=""
          disabled={pending}
          onChange={(e) => { if (e.target.value) add(e.target.value); }}
        >
          <option value="">+ Add a tag…</option>
          {available.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      {allTags.length === 0 && (
        <p className="text-xs text-brand-700/50">
          No tags created yet. <a href="/tags" className="underline">Create tags →</a>
        </p>
      )}
    </div>
  );
}
