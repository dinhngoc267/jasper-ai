"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "../logout-button";

const LINKS = [
  { href: "/admin", label: "Dashboard", dot: "var(--ink)" },
  { href: "/admin/leads", label: "Leads", dot: "var(--blue)" },
  { href: "/admin/orders", label: "Orders", dot: "var(--green)" },
  { href: "/admin/people", label: "People", dot: "var(--purple)" },
  { href: "/admin/newsletter", label: "Newsletter", dot: "var(--amber)" },
];

/**
 * The admin sidebar shell — logo badge, nav links (colored dot + label),
 * "view public site" link, and the operator footer. Client component only
 * because it needs `usePathname` to highlight the active link and render the
 * logout button; the page content it wraps stays Server Components.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-r border-[var(--rule)] bg-[var(--paper)]">
      <div className="flex items-center gap-2.5 px-5 pt-[22px] pb-4">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] text-sm font-semibold text-white">
          J
        </div>
        <div className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
          Jasper AI
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {LINKS.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[var(--cream)] font-semibold text-[var(--ink)]"
                  : "font-medium text-[var(--ink-soft)] hover:bg-[var(--cream)]/60"
              }`}
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
                style={{ background: link.dot }}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--rule)] p-4">
        <Link
          href="/"
          className="block rounded-lg px-2.5 py-2 text-[13px] text-[var(--gray-2)] transition hover:bg-[var(--cream)]/60 hover:text-[var(--ink)]"
        >
          ← View public site
        </Link>
        <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cream)] text-xs font-semibold text-[var(--gray-2)]">
              JA
            </div>
            <div className="leading-tight">
              <div className="text-[12.5px] font-medium text-[var(--ink)]">
                Jasper
              </div>
              <div className="text-[11px] text-[var(--gray-1)]">operator</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
