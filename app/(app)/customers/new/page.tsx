import Link from "next/link";
import { prisma } from "@/lib/db";
import { createCustomer } from "@/app/actions";
import CustomerForm from "@/components/customer-form";

export default async function NewCustomerPage() {
  const employees = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-brand-700/70 hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-brand-900">Add customer</h1>
      </div>
      <CustomerForm action={createCustomer} employees={employees} submitLabel="Save customer" />
    </div>
  );
}
