"use client";

import { useState, useEffect } from "react";
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

const TEAM_LINK: NavItem     = { href: "/team",     label: "Team",     icon: "🛠️" };
const SETTINGS_LINK: NavItem = { href: "/settings", label: "Settings", icon: "⚙️" };

type Section = { title: string; items: NavItem[] };

export default function MobileMenu({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isAdmin = role === "OWNER" || role === "ADMIN"; // elevated access
  const isSuper = role === "OWNER";                     // super admin only

  const sections: Section[] = [];
  if (isAdmin || role === "SALES" || role === "EMPLOYEE")
    sections.push({ title: "Sales", items: SALES_LINKS });
  if (isAdmin || role === "MARKETING")
    sections.push({ title: "Marketing", items: MARKETING_LINKS });
  if (isAdmin || role === "FINANCE")
    sections.push({ title: "Finance", items: FINANCE_LINKS });
  const mgmt = [...(isAdmin ? [TEAM_LINK] : []), ...(isSuper ? [SETTINGS_LINK] : [])];
  if (mgmt.length > 0)
    sections.push({ title: "Management", items: mgmt });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100 md:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-2xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg">🍡</span>
            <span className="font-bold text-brand-900">Marshmallow</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {sections.map((section) => (
            <div key={section.title} className="mt-3">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-400">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "text-brand-800 hover:bg-brand-100"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
