import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, canAccessMarketing, normaliseRole } from "@/lib/auth";
import RecordSaleForm from "@/components/record-sale-form";
import { tierCategories, type TierLike } from "@/lib/affiliate";

export default async function RecordSalePage({
  searchParams,
}: {
  searchParams: Promise<{ affiliate?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!canAccessMarketing(user.role, user.departments)) redirect("/dashboard");

  const params = await searchParams;
  const [affiliatesRaw, tiers] = await Promise.all([
    prisma.affiliate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { overrides: true },
    }),
    prisma.commissionTier.findMany({ orderBy: { minAmount: "asc" } }),
  ]);

  const affiliates = affiliatesRaw.map((a) => {
    const overrides: Record<string, number> = {};
    a.overrides.forEach((o) => { overrides[o.tierId] = o.percent; });
    return { id: a.id, name: a.name, couponCode: a.couponCode, overrides };
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
        <h1 className="text-xl font-bold text-brand-900">Record a sale</h1>
      </div>

      {tiers.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Set up commission tiers first.{" "}
          {isOwnerRole(role) && <Link href="/affiliates/tiers" className="font-semibold underline">Set up tiers →</Link>}
        </div>
      ) : affiliates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-6 text-center text-sm text-brand-500">
          No active creators yet. <Link href="/affiliates/new" className="font-semibold underline">Add one →</Link>
        </div>
      ) : (
        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <RecordSaleForm affiliates={affiliates} tiers={tiers as TierLike[]} categories={tierCategories(tiers)} defaultAffiliateId={params.affiliate} />
        </div>
      )}
    </div>
  );
}
