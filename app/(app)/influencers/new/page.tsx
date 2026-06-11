import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isOwnerRole, isMarketingRole, normaliseRole } from "@/lib/auth";
import CreateInfluencerForm from "@/components/create-influencer-form";

export default async function NewInfluencerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = normaliseRole(user.role);
  if (!isOwnerRole(role) && !isMarketingRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/influencers" className="text-sm text-brand-600 hover:underline">
          ← Back to influencers
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Add influencer</h1>
        <p className="text-sm text-brand-700/70">Save their profile once, then log deals against them.</p>
      </div>
      <div className="card p-6">
        <CreateInfluencerForm />
      </div>
    </div>
  );
}
