import type { ReactNode } from "react";
import { LogoutButton } from "../logout-button";
import { NavLinks } from "./nav-links";

/**
 * Shared chrome for every page behind the admin login: the "Jasper AI ·
 * Admin" label, cross-page nav, and logout button. `/admin/login` and
 * `/admin/set-password` are siblings of this route group (not children), so
 * they never render this header — see `src/lib/supabase/middleware.ts`'s
 * `PUBLIC_ADMIN_PATHS` allowlist, which is unaffected by this restructuring
 * since it matches on URL path, not file location.
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-16 sm:py-20">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--gray-2)]">
            Jasper AI · Admin
          </p>
          <NavLinks />
        </div>
        <LogoutButton />
      </header>

      <main>{children}</main>
    </div>
  );
}
