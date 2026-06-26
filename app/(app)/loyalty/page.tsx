import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canAccessSales } from "@/lib/auth";
import { getRank } from "@/lib/loyalty";

export default async function LoyaltyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role, user.departments)) redirect("/dashboard");

  const customers = await prisma.customer.findMany({
    where: { stampCount: { gt: 0 } },
    orderBy: [{ stampCount: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, whatsappNumber: true,
      stampCount: true,
      hokageRewardClaimed: true,
      pirateKingRewardClaimed: true,
      pirateKingRewardItem: true,
    },
  });

  const allCustomers = await prisma.customer.count();
  const guildMembers = customers.length;
  const pendingHokage     = customers.filter(c => c.stampCount >= 5  && !c.hokageRewardClaimed).length;
  const pendingPirateKing = customers.filter(c => c.stampCount >= 10 && !c.pirateKingRewardClaimed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-900">🏆 Marshmallow Guild</h1>
        <p className="text-sm text-brand-700/70">Loyalty programme — stamp card tracker</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{guildMembers}</p>
          <p className="text-xs text-brand-700/60">Guild members</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{allCustomers - guildMembers}</p>
          <p className="text-xs text-brand-700/60">Not enrolled yet</p>
        </div>
        <div className={`card p-4 text-center ${pendingHokage > 0 ? "border-amber-300 bg-amber-50" : ""}`}>
          <p className="text-2xl font-bold text-amber-600">{pendingHokage}</p>
          <p className="text-xs text-brand-700/60">Hokage rewards pending</p>
        </div>
        <div className={`card p-4 text-center ${pendingPirateKing > 0 ? "border-purple-300 bg-purple-50" : ""}`}>
          <p className="text-2xl font-bold text-purple-600">{pendingPirateKing}</p>
          <p className="text-xs text-brand-700/60">Pirate King rewards pending</p>
        </div>
      </div>

      {/* Rewards pending alert */}
      {(pendingHokage > 0 || pendingPirateKing > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {pendingHokage + pendingPirateKing} customer(s) have unclaimed rewards — click their name to process.
        </div>
      )}

      {/* Member table */}
      {customers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-200 px-6 py-14 text-center space-y-2">
          <p className="text-4xl">🎴</p>
          <p className="text-brand-700/60">No guild members yet.</p>
          <p className="text-sm text-brand-700/40">Add a stamp on any customer's profile to enrol them.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-100 bg-brand-50 text-xs uppercase tracking-wide text-brand-700/60">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-center">Stamps</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {customers.map((c) => {
                const rank = getRank(c.stampCount);
                const hokagePending     = c.stampCount >= 5  && !c.hokageRewardClaimed;
                const piratePending     = c.stampCount >= 10 && !c.pirateKingRewardClaimed;
                const hokageDone        = c.stampCount >= 5  && c.hokageRewardClaimed;

                return (
                  <tr key={c.id} className={`hover:bg-brand-50/50 ${piratePending ? "bg-purple-50/40" : hokagePending ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.whatsappNumber && (
                        <p className="text-xs text-brand-700/40">{c.whatsappNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span>{rank.icon}</span>
                        <span className="font-medium text-brand-900">{rank.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Mini stamp bar */}
                      <div className="flex justify-center gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full ${
                              i < c.stampCount
                                ? i === 4 || i === 9
                                  ? "bg-amber-400"
                                  : "bg-brand-500"
                                : "bg-brand-100"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-brand-700/50">{c.stampCount}/10</span>
                    </td>
                    <td className="px-4 py-3">
                      {piratePending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                          ☠️ Reward pending
                        </span>
                      )}
                      {hokagePending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          🌀 Reward pending
                        </span>
                      )}
                      {!hokagePending && !piratePending && c.pirateKingRewardItem && (
                        <span className="text-xs text-brand-700/40">✅ {c.pirateKingRewardItem}</span>
                      )}
                      {!hokagePending && !piratePending && hokageDone && !c.pirateKingRewardItem && (
                        <span className="text-xs text-brand-700/40">✅ Hokage given</span>
                      )}
                      {!hokagePending && !piratePending && !hokageDone && (
                        <span className="text-xs text-brand-700/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
