import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, roleLabel, isSuperAdminRole } from "@/lib/auth";
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

  return (
    <div className="flex flex-1">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <MobileMenu role={user.role} />
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
