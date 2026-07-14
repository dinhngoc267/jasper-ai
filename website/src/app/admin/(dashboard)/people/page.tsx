import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PersonContactRow, PersonOrderRow, PersonRow } from "@/lib/people";
import type { ActivityLogRow } from "@/lib/leads";
import { PeopleDirectory } from "./people-directory";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/orders/newsletter pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "People — Jasper AI Admin",
};

/** Fetch everything the People directory (and its per-person drawer) needs:
 * every person, every inquiry, every status change, and every order.
 * Returns null (not throws) if the DB is unreachable, mirroring the leads
 * page's fallback behavior. */
async function fetchDirectory(): Promise<{
  people: PersonRow[];
  contacts: PersonContactRow[];
  activity: ActivityLogRow[];
  orders: PersonOrderRow[];
} | null> {
  try {
    const supabase = getSupabaseAdmin();

    const [peopleRes, contactsRes, activityRes, ordersRes] = await Promise.all([
      supabase
        .from("people")
        .select(
          "id, email, name, phone, company, role, source_site, ok_to_contact, attributes, created_at, updated_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("id, person_id, type, subject, message, source, status, created_at")
        .order("created_at", { ascending: false }),
      // activity_log may not exist yet if migration 0002 hasn't run — fetched
      // separately below so its absence never blocks the rest of the page.
      supabase
        .from("activity_log")
        .select("id, contact_id, from_status, to_status, actor, note, created_at")
        .order("created_at", { ascending: true }),
      // orders may not exist yet if migration 0003 hasn't run — same
      // best-effort fallback.
      supabase
        .from("orders")
        .select(
          "id, person_id, product_name, amount_cents, currency, status, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (peopleRes.error) throw peopleRes.error;
    if (contactsRes.error) throw contactsRes.error;

    return {
      people: (peopleRes.data as unknown as PersonRow[]) ?? [],
      contacts: (contactsRes.data as unknown as PersonContactRow[]) ?? [],
      activity: activityRes.error
        ? []
        : (activityRes.data as unknown as ActivityLogRow[]) ?? [],
      orders: ordersRes.error
        ? []
        : (ordersRes.data as unknown as PersonOrderRow[]) ?? [],
    };
  } catch (err) {
    console.error("[admin] failed to load the People directory:", err);
    return null;
  }
}

export default async function AdminPeoplePage() {
  const directory = await fetchDirectory();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          People
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          One row per person, deduplicated by email. Click a row to see their
          full history — inquiries, status changes, and orders — in one
          place.
        </p>
      </header>

      {directory === null || directory.people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
          <p className="text-lg font-medium text-[var(--ink)]">
            No people yet or database not connected
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
            {directory !== null
              ? "Once someone submits the contact form, they'll show up here."
              : "The database isn't reachable yet. Set the environment variables and refresh."}
          </p>
        </div>
      ) : (
        <PeopleDirectory
          people={directory.people}
          contacts={directory.contacts}
          activity={directory.activity}
          orders={directory.orders}
        />
      )}
    </div>
  );
}
