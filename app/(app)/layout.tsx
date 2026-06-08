import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import Sidebar from "@/components/sidebar";

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
        <header className="flex items-center justify-between border-b border-brand-100 bg-white px-6 py-3">
          <div className="text-sm text-brand-700/70 md:hidden font-semibold">
            🍡 Marshmallow CRM
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-900">{user.name}</p>
              <p className="text-xs text-brand-700/60">
                {user.role === "OWNER" ? "Owner" : "Employee"} · {user.email}
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
