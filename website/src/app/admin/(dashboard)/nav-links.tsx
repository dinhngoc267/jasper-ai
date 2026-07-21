"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "../logout-button";

const NAV_SECTIONS: {
  label: string | null;
  links: { href: string; label: string; dot: string }[];
}[] = [
  {
    label: null, // Overview sits at the top with no header, like a home row.
    links: [{ href: "/admin", label: "Dashboard", dot: "var(--ink)" }],
  },
  {
    label: "Pipeline",
    links: [
      { href: "/admin/leads", label: "Leads", dot: "var(--blue)" },
      { href: "/admin/orders", label: "Orders", dot: "var(--green)" },
      { href: "/admin/people", label: "People", dot: "var(--purple)" },
      { href: "/admin/newsletter", label: "Newsletter", dot: "var(--amber)" },
    ],
  },
  {
    label: "Content",
    links: [{ href: "/admin/content", label: "Content", dot: "var(--teal)" }],
  },
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

      <nav className="flex flex-col px-3 py-2">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? "overview"} className={i > 0 ? "mt-5" : ""}>
            {section.label && (
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-1)]">
                {section.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.links.map((link) => {
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
            </div>
          </div>
        ))}
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
