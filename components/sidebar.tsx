"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tasks", label: "Today", icon: "✅" },
  { href: "/pipeline", label: "Pipeline", icon: "📋" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/sequences", label: "Sequences", icon: "📨" },
  { href: "/automations", label: "Automations", icon: "⚡" },
  { href: "/broadcasts", label: "Promotions", icon: "📣" },
  { href: "/followups", label: "Follow-ups", icon: "⏰" },
];

export default function Sidebar({ role }: { role: "OWNER" | "EMPLOYEE" }) {
  const pathname = usePathname();
  const items = role === "OWNER" ? [...links, { href: "/team", label: "Team", icon: "🛠️" }] : links;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-brand-100 bg-white md:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg">
          🍡
        </span>
        <span className="font-bold text-brand-900">Marshmallow</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
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
      </nav>
    </aside>
  );
}
