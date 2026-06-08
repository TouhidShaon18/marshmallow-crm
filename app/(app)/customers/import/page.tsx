import Link from "next/link";
import { prisma } from "@/lib/db";
import ImportForm from "@/components/import-form";

export default async function ImportPage() {
  const employees = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-brand-700/70 hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-900">Import customers from Excel</h1>
        <p className="text-sm text-brand-700/70">
          Upload a spreadsheet (.xlsx, .xls or .csv) and we&apos;ll add everyone at once.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          1. Get the template
        </h2>
        <p className="mb-3 text-sm text-brand-700/80">
          Easiest way: download our template, fill in your customers (one per row), and upload it back.
        </p>
        <a href="/customers/import/template" className="btn-secondary">⬇️ Download Excel template</a>

        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
          <p className="font-semibold">Columns we understand (only Name is required):</p>
          <p className="mt-1">
            Name · WhatsApp · Email · Address · Favourite Anime · Product Bought ·
            Channel (online/offline) · Gift Received · Birthday · Order Amount · Repeat Customer (yes/no)
          </p>
          <p className="mt-2 text-brand-700/70">
            Already have your own sheet? That&apos;s fine — we match columns by name, so
            &quot;Phone&quot;, &quot;Mobile&quot;, &quot;Anime&quot;, &quot;Amount&quot; etc. all work too.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          2. Upload your file
        </h2>
        <ImportForm employees={employees} />
      </div>
    </div>
  );
}
