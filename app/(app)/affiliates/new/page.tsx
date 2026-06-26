import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, canAccessMarketing } from "@/lib/auth";
import AffiliateForm from "@/components/affiliate-form";

export default async function NewAffiliatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessMarketing(user.role, user.departments)) redirect("/dashboard");

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/affiliates" className="text-brand-500 hover:text-brand-700 text-sm">← Affiliates</Link>
        <h1 className="text-xl font-bold text-brand-900">Add creator</h1>
      </div>
      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <AffiliateForm />
      </div>
    </div>
  );
}
