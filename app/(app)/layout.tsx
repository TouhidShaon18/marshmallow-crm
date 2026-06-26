import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, roleLabel, isSuperAdminRole, isOwnerRole, canAccessSales, canAccessMarketing, canAccessFinance } from "@/lib/auth";
import { logout } from "@/app/actions";
import Sidebar from "@/components/sidebar";
import MobileMenu from "@/components/mobile-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const caps = {
    sales:     canAccessSales(user.role, user.departments),
    marketing: canAccessMarketing(user.role, user.departments),
    finance:   canAccessFinance(user.role, user.departments),
    team:      isOwnerRole(user.role),       // owner / admin / manager
    settings:  isSuperAdminRole(user.role),
  };

  return (
    <div className="flex flex-1">
      <Sidebar caps={caps} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <MobileMenu caps={caps} />
            <span className="text-sm font-semibold text-brand-900">🍡 Marshmallow CRM</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isSuperAdminRole(user.role) && (
              <Link
                href="/settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-100"
                title="Settings"
              >
                ⚙️
              </Link>
            )}
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-900">{user.name}</p>
              <p className="text-xs text-brand-700/60">
                {roleLabel(user.role)} · {user.email}
              </p>
            </div>
            <form action={logout}>
              <button type="submit" className="btn-secondary">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
