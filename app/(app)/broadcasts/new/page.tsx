import Link from "next/link";
import { prisma } from "@/lib/db";
import BroadcastForm from "@/components/broadcast-form";

export default async function NewBroadcastPage() {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/broadcasts" className="text-sm text-brand-700/70 hover:underline">← Back to promotions</Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-900">New promotion</h1>
      </div>
      <BroadcastForm tags={tags} />
    </div>
  );
}
