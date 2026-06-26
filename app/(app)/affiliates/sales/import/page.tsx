import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, canAccessMarketing } from "@/lib/auth";
import SalesImportForm from "@/components/sales-import-form";

export default async function ImportSalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessMarketing(user.role, user.departments)) redirect("/dashboard");

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
        <h1 className="text-xl font-bold text-brand-900">Import affiliate sales</h1>
      </div>

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-500">1. Get the template</h2>
        <p className="mb-3 text-sm text-brand-700/80">
          Download the template, fill one sale per row (coupon code + amount, plus optional order ref, product, date), and upload it back.
        </p>
        <a href="/affiliates/sales/template" className="btn-secondary">⬇️ Download Excel template</a>
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
          <p className="font-semibold">Columns we understand (Coupon &amp; Amount required):</p>
          <p className="mt-1">Coupon · Amount · Order · Product · Date</p>
          <p className="mt-2 text-brand-700/70">
            We match each row&apos;s coupon to a creator and calculate commission from the order amount&apos;s
            bracket. Rows with unknown coupon codes are skipped and reported.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-500">2. Upload your file</h2>
        <SalesImportForm />
      </div>
    </div>
  );
}
