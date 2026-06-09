import { prisma } from "@/lib/db";
import { getCustomerInsight } from "@/lib/ai";

// Async server component — rendered inside a <Suspense> on the customer detail page.
// Returns null when ANTHROPIC_API_KEY is not set.
export default async function CustomerInsight({ customerId }: { customerId: string }) {
  if (!process.env.OPENAI_API_KEY) return null;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      name: true,
      stage: true,
      favouriteAnime: true,
      productBought: true,
      orderAmount: true,
      repeatCustomer: true,
      lastContactedAt: true,
      interactions: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { type: true, summary: true },
      },
    },
  });

  if (!customer) return null;

  const insight = await getCustomerInsight(customer);
  if (!insight) return null;

  return (
    <div className="card p-5 border-l-4 border-brand-500">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600">
        ✨ AI Suggestion
      </p>
      <p className="text-sm leading-relaxed text-brand-900">{insight}</p>
    </div>
  );
}

export function CustomerInsightSkeleton() {
  return (
    <div className="card p-5 animate-pulse border-l-4 border-brand-200">
      <div className="mb-2 h-3 w-24 rounded bg-brand-100" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-100" />
        <div className="h-3 w-3/4 rounded bg-brand-100" />
      </div>
    </div>
  );
}
