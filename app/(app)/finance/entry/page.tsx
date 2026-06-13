import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole, isFinanceRole, normaliseRole } from "@/lib/auth";
import FinanceEntryForm from "@/components/finance-entry-form";
import FinancePeriodSelector from "@/components/finance-period-selector";
import { defaultPeriod, formatPeriodLong, isValidPeriod, type FinancePeriodType } from "@/lib/finance";

export default async function FinanceEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isFinanceRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const periodType: FinancePeriodType = (["DAILY", "WEEKLY", "MONTHLY"].includes(params.type ?? "")
    ? params.type
    : "MONTHLY") as FinancePeriodType;
  const period = params.period && isValidPeriod(periodType, params.period)
    ? params.period
    : defaultPeriod(periodType);

  const existing = await prisma.financeEntry.findUnique({
    where: { periodType_period: { periodType, period } },
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/finance" className="text-brand-500 hover:text-brand-700 text-sm">← Finance</Link>
        <h1 className="text-xl font-bold text-brand-900">
          {existing ? "Edit" : "New"} P&amp;L Entry — {formatPeriodLong(periodType, period)}
        </h1>
      </div>

      <FinancePeriodSelector type={periodType} period={period} basePath="/finance/entry" />

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <FinanceEntryForm key={`${periodType}-${period}`} existing={existing} periodType={periodType} period={period} />
      </div>
    </div>
  );
}
