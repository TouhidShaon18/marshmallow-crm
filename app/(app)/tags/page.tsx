import { prisma } from "@/lib/db";
import { createTag, deleteTag } from "@/app/tag-actions";
import TagBadge, { TAG_COLOR_KEYS } from "@/components/tag-badge";
import CreateTagForm from "@/components/create-tag-form";
import DeleteButton from "@/components/delete-button";

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { customers: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Tags</h1>
        <p className="text-sm text-brand-700/70">
          Organise customers with labels. Filter the customer list and broadcasts by tag.
        </p>
      </div>

      {/* Create tag */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700/70">New tag</h2>
        <CreateTagForm />
      </div>

      {/* Tags list */}
      <div className="card divide-y divide-brand-50">
        {tags.length === 0 ? (
          <p className="p-6 text-center text-sm text-brand-700/60">
            No tags yet. Create your first one above.
          </p>
        ) : (
          tags.map((t) => {
            const del = deleteTag.bind(null, t.id);
            return (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <TagBadge name={t.name} color={t.color} />
                  <span className="text-xs text-brand-700/60">
                    {t._count.customers} customer{t._count.customers !== 1 ? "s" : ""}
                  </span>
                </div>
                <DeleteButton
                  action={del}
                  message={`Delete the tag "${t.name}"? It will be removed from all customers.`}
                  className="btn-ghost text-xs text-red-600 hover:bg-red-50"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
