"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

const SALES_LINKS: NavItem[] = [
  { href: "/dashboard",  label: "Dashboard",   icon: "📊" },
  { href: "/customers",  label: "Customers",   icon: "👥" },
  { href: "/followups",  label: "Follow-ups",  icon: "⏰" },
  { href: "/tasks",      label: "Today",       icon: "✅" },
  { href: "/pipeline",   label: "Pipeline",    icon: "📋" },
  { href: "/loyalty",    label: "Loyalty",     icon: "🏆" },
  { href: "/sequences",  label: "Sequences",   icon: "📨" },
  { href: "/tags",       label: "Tags",        icon: "🏷️" },
];

const MARKETING_LINKS: NavItem[] = [
  { href: "/marketing",        label: "Marketing Hub",  icon: "🎯" },
  { href: "/social-planner",   label: "Social Planner", icon: "📅" },
  { href: "/broadcasts",       label: "Broadcasts",     icon: "📣" },
  { href: "/campaigns",        label: "Campaigns",      icon: "🚀" },
  { href: "/influencers",      label: "Influencers",    icon: "🌟" },
  { href: "/affiliates",       label: "Affiliates",     icon: "🤝" },
  { href: "/automations",      label: "Automations",    icon: "⚡" },
];

const FINANCE_LINKS: NavItem[] = [
  { href: "/finance",        label: "Dashboard",    icon: "📈", exact: true },
  { href: "/finance/entry",  label: "P&L Entry",    icon: "📝" },
  { href: "/finance/goals",  label: "Goals",        icon: "🎯" },
];

const MGMT_LINKS: NavItem[] = [
  { href: "/team",     label: "Team",     icon: "🛠️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="mt-3">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-400">
        {title}
      </p>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-600 text-white"
                : "text-brand-800 hover:bg-brand-100"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar({ role }: { role: AppRole }) {
  const showSales      = role === "OWNER" || role === "SALES"    || role === "EMPLOYEE";
  const showMarketing  = role === "OWNER" || role === "MARKETING";
  const showFinance    = role === "OWNER" || role === "FINANCE";
  const showMgmt       = role === "OWNER";

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-brand-100 bg-white md:flex h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-4 shrink-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg">
          🍡
        </span>
        <span className="font-bold text-brand-900">Marshmallow</span>
      </div>

      <nav className="flex flex-col overflow-y-auto px-3 py-2 pb-6">
        {showSales     && <NavGroup title="Sales"      items={SALES_LINKS} />}
        {showMarketing && <NavGroup title="Marketing"  items={MARKETING_LINKS} />}
        {showFinance   && <NavGroup title="Finance"    items={FINANCE_LINKS} />}
        {showMgmt      && <NavGroup title="Management" items={MGMT_LINKS} />}
      </nav>
    </aside>
  );
}
