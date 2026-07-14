import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ActivityLogRow, LeadRow } from "@/lib/leads";
import { LeadsBoard } from "./leads-board";
import { LogoutButton } from "./logout-button";

// Render on every request — never at build time (there is no database during
// `next build`). This keeps the build green without a database connection.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads — Jasper AI Admin",
};

/** Fetch leads newest-first. Returns null (not throws) if the DB is unreachable. */
async function fetchLeads(): Promise<LeadRow[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, person_id, type, subject, message, source, status, created_at, people ( id, name, email, company, attributes, created_at )"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as LeadRow[]) ?? [];
  } catch (err) {
    console.error("[admin] failed to load leads:", err);
    return null;
  }
}

/**
 * Fetch the status-change audit trail. Returns `[]` (not null) on failure —
 * as of this writing the operator has not yet run migration 0002, so
 * `activity_log` doesn't exist in production. That must never block the
 * board itself: every lead just shows "No status changes yet" and staleness
 * falls back to the contact's `created_at`.
 */
async function fetchActivityLog(): Promise<ActivityLogRow[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("activity_log")
      .select("id, contact_id, from_status, to_status, actor, note, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as unknown as ActivityLogRow[]) ?? [];
  } catch (err) {
    console.error(
      "[admin] activity_log not available yet (expected until migration 0002 runs):",
      err
    );
    return [];
  }
}

export default async function AdminLeadsPage() {
  const [leads, activity] = await Promise.all([fetchLeads(), fetchActivityLog()]);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 py-16 sm:py-20">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--gray-2)]">
            Jasper AI · Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Leads
          </h1>
          <p className="mt-2 text-[var(--gray-2)]">
            Every inquiry from the site, worked from first contact to won or
            lost. Click a card to see the full record and move it to a new
            stage.
          </p>
        </div>
        <LogoutButton />
      </header>

      {leads === null || leads.length === 0 ? (
        <EmptyState connected={leads !== null} />
      ) : (
        <LeadsBoard leads={leads} activity={activity} />
      )}
    </main>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No leads yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "Once someone submits the contact form, their inquiry will appear here automatically."
          : "The database isn't reachable yet. Run the migration in Supabase and set the environment variables, then refresh."}
      </p>
    </div>
  );
}
