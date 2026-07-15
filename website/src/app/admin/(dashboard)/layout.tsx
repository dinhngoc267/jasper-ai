import type { ReactNode } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { Sidebar } from "./nav-links";

/** Count of open `new_lead` contacts, shown as the Leads nav badge. Best
 * effort — 0 (not a thrown error) if the DB is unreachable, same fallback
 * pattern as every other admin data fetch. */
async function fetchNewLeadCount(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("status", "new_lead");
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.error("[admin] failed to load new lead count:", err);
    return 0;
  }
}

/**
 * Shared chrome for every page behind the admin login: the left sidebar
 * (logo, nav, public-site link, operator footer) plus the page content.
 * `/admin/login` and `/admin/set-password` are siblings of this route group
 * (not children), so they never render this shell — see
 * `src/lib/supabase/middleware.ts`'s `PUBLIC_ADMIN_PATHS` allowlist, which
 * is unaffected by this restructuring since it matches on URL path, not
 * file location.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const newLeadCount = await fetchNewLeadCount();

  return (
    <div className="flex min-h-screen bg-[var(--cream)]">
      <Sidebar newLeadCount={newLeadCount} />
      <main className="min-w-0 flex-1 px-9 py-[30px] pb-[60px]">
        {children}
      </main>
    </div>
  );
}
