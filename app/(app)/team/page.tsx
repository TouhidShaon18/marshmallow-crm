import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteEmployee } from "@/app/actions";
import EmployeeForm from "@/components/employee-form";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const members = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { customers: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Team</h1>
        <p className="text-sm text-brand-700/70">Add employees and manage who can log in.</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Add a team member
        </h2>
        <EmployeeForm />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700/70">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Customers</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {members.map((m) => {
              const del = deleteEmployee.bind(null, m.id);
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-brand-900">{m.name}</td>
                  <td className="px-4 py-3 text-brand-700/80">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${m.role === "OWNER" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.role === "OWNER" ? "Owner" : "Employee"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m._count.customers}</td>
                  <td className="px-4 py-3 text-right">
                    {m.id !== user.id && (
                      <form action={del}>
                        <button type="submit" className="text-sm text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
