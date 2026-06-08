import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateCustomer } from "@/app/actions";
import CustomerForm from "@/components/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, employees] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/customers/${id}`} className="text-sm text-brand-700/70 hover:underline">
          ← Back to {customer.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-900">Edit customer</h1>
      </div>
      <CustomerForm action={action} employees={employees} customer={customer} submitLabel="Save changes" />
    </div>
  );
}
