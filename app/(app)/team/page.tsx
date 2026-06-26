import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, roleLabel, normaliseRole, isMarketingRole, isOwnerRole, isSuperAdminRole, assignableRoles } from "@/lib/auth";
import { deleteEmployee } from "@/app/actions";
import { getTargetProgress, getMarketingProgress } from "@/app/target-actions";
import EmployeeForm from "@/components/employee-form";
import SetTargetForm from "@/components/set-target-form";
import { TargetCard, MarketingTargetCard } from "@/components/target-progress";
import DeleteButton from "@/components/delete-button";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOwnerRole(user.role)) redirect("/dashboard");
  const canSeeSettings = isSuperAdminRole(user.role);
  const allowedRoles = assignableRoles(normaliseRole(user.role));

  const period = currentPeriod();

  const members = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { customers: true } },
      targets: { where: { period }, take: 1 },
    },
  });

  // Fetch actual progress for employees only
  const employees = members.filter(
    (m) => m.role === "EMPLOYEE" || m.role === "SALES" || m.role === "MARKETING",
  );

  // Fetch sales progress for sales/legacy employees, marketing progress for marketing employees
  const progressMap: Record<string, Awaited<ReturnType<typeof getTargetProgress>>> = {};
  const marketingProgressMap: Record<string, Awaited<ReturnType<typeof getMarketingProgress>>> = {};

  await Promise.all(
    employees.map(async (m) => {
      const role = normaliseRole(m.role);
      if (isMarketingRole(role)) {
        marketingProgressMap[m.id] = await getMarketingProgress(m.id, period);
      } else {
        progressMap[m.id] = await getTargetProgress(m.id, period);
      }
    }),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Team</h1>
          <p className="text-sm text-brand-700/70">Manage employees and set monthly targets.</p>
        </div>
        {canSeeSettings && (
          <Link href="/settings" className="btn-secondary text-sm whitespace-nowrap">
            ⚙️ Settings
          </Link>
        )}
      </div>

      {/* Add employee */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-700/70">
          Add a team member
        </h2>
        <EmployeeForm allowedRoles={allowedRoles} />
      </div>

      {/* Team list */}
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
                    <span
                      className={`badge ${
                        m.role === "OWNER"
                          ? "bg-amber-100 text-amber-700"
                          : m.role === "ADMIN"
                          ? "bg-brand-100 text-brand-700"
                          : m.role === "MANAGER"
                          ? "bg-indigo-100 text-indigo-700"
                          : m.role === "MARKETING"
                          ? "bg-pink-100 text-pink-700"
                          : m.role === "FINANCE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {roleLabel(normaliseRole(m.role))}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m._count.customers}</td>
                  <td className="px-4 py-3 text-right">
                    {m.id !== user.id && (
                      <DeleteButton
                        action={del}
                        label="Remove"
                        message={`Remove ${m.name} from the team? Their customers will be unassigned.`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Monthly targets */}
      {employees.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Monthly Targets</h2>
            <p className="text-sm text-brand-700/70">
              Set targets for {period}. Progress updates in real time.
            </p>
          </div>

          <div className="space-y-4">
            {employees.map((m) => {
              const target  = m.targets[0] ?? null;
              const role    = normaliseRole(m.role);
              const isMkt   = isMarketingRole(role);

              return (
                <div key={m.id} className="card p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-900">{m.name}</p>
                      <p className="text-xs text-brand-700/60">{m.email}</p>
                    </div>
                    <SetTargetForm
                      userId={m.id}
                      name={m.name}
                      period={period}
                      role={role}
                      current={target}
                    />
                  </div>

                  {isMkt ? (
                    <MarketingTargetCard
                      name={m.name}
                      target={
                        target ?? {
                          postsTarget: null,
                          viewsTarget: null,
                          reactsTarget: null,
                          commentsTarget: null,
                          sharesTarget: null,
                        }
                      }
                      actual={
                        marketingProgressMap[m.id] ?? {
                          posts: 0, views: 0, reacts: 0, comments: 0, shares: 0,
                        }
                      }
                    />
                  ) : (
                    <TargetCard
                      name={m.name}
                      target={
                        target ?? {
                          revenueTarget: null,
                          contactTarget: null,
                          followup7dTarget: null,
                          followup30dTarget: null,
                          convertedSaleTarget: null,
                          repeatSaleTarget: null,
                          newCustomerTarget: null,
                        }
                      }
                      actual={
                        progressMap[m.id] ?? {
                          revenue: 0,
                          contacts: 0,
                          followup7d: 0,
                          followup30d: 0,
                          convertedSales: 0,
                          repeatSales: 0,
                          newCustomers: 0,
                        }
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
