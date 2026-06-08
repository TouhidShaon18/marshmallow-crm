import Link from "next/link";
import { prisma } from "@/lib/db";
import StageSelect from "@/components/stage-select";
import { STAGES, STAGE_LABEL, STAGE_COLOR, type StageKey } from "@/lib/labels";

export default async function PipelinePage() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      stage: true,
      favouriteAnime: true,
      orderAmount: true,
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStage: Record<string, typeof customers> = {};
  for (const s of STAGES) byStage[s] = [];
  for (const c of customers) (byStage[c.stage] ??= []).push(c);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Pipeline</h1>
        <p className="text-sm text-brand-700/70">
          Track where each customer is. Change a card&apos;s stage with its dropdown.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const list = byStage[stage] ?? [];
          const total = list.reduce((sum, c) => sum + (c.orderAmount ?? 0), 0);
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <span className={`badge ${STAGE_COLOR[stage as StageKey]}`}>
                  {STAGE_LABEL[stage as StageKey]}
                </span>
                <span className="text-xs text-brand-700/60">
                  {list.length} · ৳{total.toLocaleString()}
                </span>
              </div>
              <div className="space-y-2 rounded-xl bg-brand-100/40 p-2 min-h-24">
                {list.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-brand-700/40">Empty</p>
                ) : (
                  list.map((c) => (
                    <div key={c.id} className="card p-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-800 hover:underline">
                        {c.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-brand-700/60">
                        {c.favouriteAnime ?? "—"}
                        {c.orderAmount != null ? ` · ৳${c.orderAmount}` : ""}
                      </p>
                      <p className="text-xs text-brand-700/50">{c.assignedTo?.name ?? "Unassigned"}</p>
                      <div className="mt-2">
                        <StageSelect customerId={c.id} current={c.stage} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
