import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOwnerRole } from "@/lib/auth";
import CustomersTable from "@/components/customers-table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const user = await getCurrentUser();
  const canBulkDelete = !!user && isOwnerRole(user.role);
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

      {customers.length === 0 ? (
        <div className="card p-10 text-center text-brand-700/60">
          {query || tag ? "No customers match your filter." : "No customers yet. Add your first one!"}
        </div>
      ) : (
        <CustomersTable customers={customers} canBulkDelete={canBulkDelete} />
      )}
    </div>
  );
}
