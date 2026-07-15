import type { ReactNode } from "react";
import { Sidebar } from "./nav-links";

/**
 * Shared chrome for every page behind the admin login: the left sidebar
 * (logo, nav, public-site link, operator footer) plus the page content.
 * `/admin/login` and `/admin/set-password` are siblings of this route group
 * (not children), so they never render this shell — see
 * `src/lib/supabase/middleware.ts`'s `PUBLIC_ADMIN_PATHS` allowlist, which
 * is unaffected by this restructuring since it matches on URL path, not
 * file location.
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--cream)]">
      <Sidebar />
      <main className="min-w-0 flex-1 px-9 py-[30px] pb-[60px]">
        {children}
      </main>
    </div>
  );
}
