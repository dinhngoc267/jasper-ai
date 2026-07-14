"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Leads" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

/** Nav is a client component only so it can highlight the active link via
 * `usePathname` — everything else in the dashboard layout stays a plain
 * Server Component. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-4">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-semibold transition ${
              isActive
                ? "text-[var(--ink)]"
                : "text-[var(--gray-2)] hover:text-[var(--ink)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
