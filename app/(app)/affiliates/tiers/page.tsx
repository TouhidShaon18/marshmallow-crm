import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, normaliseRole } from "@/lib/auth";
import { seedDefaultTiers } from "@/app/affiliate-actions";
import TiersForm from "@/components/tiers-form";

export default async function TiersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(normaliseRole(user.role))) redirect("/affiliates");

  const tiers = await prisma.commissionTier.findMany({ orderBy: { sort: "asc" } });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
        <h1 className="text-xl font-bold text-brand-900">Commission tiers</h1>
      </div>

      <p className="text-sm text-brand-500">
        Set the default commission % for each order-value bracket. These apply to every creator,
        unless you set a custom rate on a creator&apos;s page.
      </p>

      {tiers.length === 0 && (
        <form action={seedDefaultTiers} className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm text-brand-700 mb-3">
            Start from a suggested set of brackets (Under ৳3k, ৳3k–10k, ৳10k–20k, ৳20k–50k, ৳50k–100k, ৳100k+),
            then tweak the percentages.
          </p>
          <button type="submit" className="btn-secondary text-sm">Create starter tiers</button>
        </form>
      )}

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <TiersForm tiers={tiers} />
      </div>
    </div>
  );
}
