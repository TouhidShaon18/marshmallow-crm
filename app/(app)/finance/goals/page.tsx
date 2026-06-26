import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdminRole, normaliseRole } from "@/lib/auth";
import FinanceGoalsForm from "@/components/finance-goals-form";
import PeriodPicker from "@/components/period-picker";

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default async function FinanceGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(normaliseRole(user.role))) redirect("/finance");

  const params = await searchParams;
  const nowPeriod = new Date().toISOString().slice(0, 7);
  const period = params.period && /^\d{4}-\d{2}$/.test(params.period) ? params.period : nowPeriod;

  const existing = await prisma.financeGoal.findUnique({ where: { period } });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/finance" className="text-brand-500 hover:text-brand-700 text-sm">← Finance</Link>
        <h1 className="text-xl font-bold text-brand-900">
          {existing ? "Edit" : "Set"} Goals — {periodLabel(period)}
        </h1>
      </div>

      <PeriodPicker value={period} basePath="/finance/goals" />

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <p className="text-sm text-brand-500 mb-4">
          Set financial targets for {periodLabel(period)}. Leave any field blank to skip that goal.
        </p>
        <FinanceGoalsForm existing={existing} defaultPeriod={period} />
      </div>
    </div>
  );
}
