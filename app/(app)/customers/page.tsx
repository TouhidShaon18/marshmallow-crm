import Link from "next/link";
import { prisma } from "@/lib/db";
import TagBadge from "@/components/tag-badge";
import { getRank } from "@/lib/loyalty";

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const query = q?.trim();

  const [customers, allTags] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { favouriteAnime: { contains: query } },
                { productBought: { contains: query } },
                { whatsappNumber: { contains: query } },
                { email: { contains: query } },
              ],
            }
          : {}),
        ...(tag ? { tags: { some: { id: tag } } } : {}),
      },
      include: {
        assignedTo: { select: { name: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);

  const activeTag = allTags.find((t) => t.id === tag);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Customers</h1>
          <p className="text-sm text-brand-700/70">{customers.length} customer{customers.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import" className="btn-secondary">⬆️ Import Excel</Link>
          <Link href="/customers/new" className="btn-primary">+ Add customer</Link>
        </div>
      </div>

      {/* Search + tag filter */}
      <div className="flex flex-wrap gap-2">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search by name, anime, product, phone…"
            className="input max-w-xs"
          />
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button type="submit" className="btn-secondary">Search</button>
          {(query || tag) && <Link href="/customers" className="btn-ghost">Clear</Link>}
        </form>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-brand-700/60 font-medium">Filter by tag:</span>
          {allTags.map((t) => (
            <Link
              key={t.id}
              href={`/customers?${query ? `q=${encodeURIComponent(query)}&` : ""}tag=${t.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tag === t.id
                  ? "bg-brand-600 text-white"
                  : "bg-brand-100 text-brand-700 hover:bg-brand-200"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {activeTag && (
        <p className="text-sm text-brand-700/70">
          Showing customers tagged <strong>{activeTag.name}</strong> ·{" "}
          <Link href={query ? `/customers?q=${encodeURIComponent(query)}` : "/customers"} className="text-brand-600 underline">
            Clear filter
          </Link>
        </p>
      )}

      <div className="card overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-10 text-center text-brand-700/60">
            {query || tag ? "No customers match your filter." : "No customers yet. Add your first one!"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700/70">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Anime</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 hidden sm:table-cell">Channel</th>
                <th className="px-4 py-3 hidden md:table-cell">Assigned</th>
                <th className="px-4 py-3">Last contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {customers.map((c) => {
                const since = daysSince(c.lastContactedAt);
                const overdue = since == null || since >= 7;
                return (
                  <tr key={c.id} className="hover:bg-brand-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.repeatCustomer && (
                        <span className="badge ml-2 bg-amber-100 text-amber-700">repeat</span>
                      )}
                      {c.stampCount > 0 && (
                        <span className="badge ml-2 bg-purple-100 text-purple-700">
                          {getRank(c.stampCount).icon} {getRank(c.stampCount).name}
                        </span>
                      )}
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <TagBadge key={t.id} name={t.name} color={t.color} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{c.favouriteAnime ?? "—"}</td>
                    <td className="px-4 py-3">{c.productBought ?? "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`badge ${c.channel === "ONLINE" ? "bg-sky-100 text-sky-700" : "bg-brand-100 text-brand-700"}`}>
                        {c.channel === "ONLINE" ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{c.assignedTo?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {since == null ? (
                        <span className="text-red-600">Never</span>
                      ) : (
                        <span className={overdue ? "text-red-600 font-medium" : "text-brand-700/70"}>
                          {since === 0 ? "Today" : `${since}d ago`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
