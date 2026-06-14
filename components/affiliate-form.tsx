"use client";

import { useActionState } from "react";
import { createAffiliate, updateAffiliate } from "@/app/affiliate-actions";
import { AFFILIATE_PLATFORMS } from "@/lib/affiliate";
import type { Affiliate } from "@prisma/client";

export default function AffiliateForm({ existing }: { existing?: Affiliate }) {
  const action = existing ? updateAffiliate : createAffiliate;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {existing && <input type="hidden" name="id" value={existing.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Creator name</label>
          <input name="name" required defaultValue={existing?.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Coupon code</label>
          <input
            name="couponCode"
            required
            defaultValue={existing?.couponCode ?? ""}
            placeholder="e.g. AIKO10"
            className="input uppercase"
          />
        </div>
        <div>
          <label className="label">Platform</label>
          <select name="platform" defaultValue={existing?.platform ?? ""} className="input">
            <option value="">— Select —</option>
            {AFFILIATE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Social handle</label>
          <input name="socialHandle" defaultValue={existing?.socialHandle ?? ""} placeholder="@username" className="input" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input name="phone" defaultValue={existing?.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={existing?.email ?? ""} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} defaultValue={existing?.notes ?? ""} className="input" />
      </div>

      {existing && (
        <label className="flex items-center gap-2 text-sm text-brand-700">
          <input type="checkbox" name="active" defaultChecked={existing.active} className="h-4 w-4" />
          Active
        </label>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : existing ? "Save changes" : "Add creator"}
      </button>
    </form>
  );
}
