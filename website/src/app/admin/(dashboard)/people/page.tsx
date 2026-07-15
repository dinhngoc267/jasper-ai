import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PersonRow } from "@/lib/people";
import { firstParam, parsePage, sanitizeSearch } from "@/lib/search";
import { ListToolbar } from "../list-toolbar";
import { PAGE_SIZE, Pagination } from "../pagination";
import { PeopleDirectory } from "./people-directory";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/orders/newsletter pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "People — Jasper AI Admin",
};

type PeopleResult = { rows: PersonRow[]; total: number };

/**
 * Fetch ONE page of people, newest-first, with search (name/email/company) and
 * the newsletter-segment filter applied in the query. Returns null (not
 * throws) if the DB is unreachable.
 *
 * Unlike before, this no longer bulk-loads contacts / activity_log / orders —
 * the per-person drawer fetches those lazily via the `getPersonDetail` server
 * action when opened, so the list only ever pulls the current page of people.
 */
async function fetchPeople({
  q,
  segment,
  page,
}: {
  q: string;
  segment: string;
  page: number;
}): Promise<PeopleResult | null> {
  try {
    const supabase = getSupabaseAdmin();
    const term = sanitizeSearch(q);

    let query = supabase
      .from("people")
      .select(
        "id, email, name, phone, company, role, source_site, ok_to_contact, attributes, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`
      );
    }
    if (segment === "opted-in") query = query.eq("ok_to_contact", true);
    else if (segment === "opted-out") query = query.eq("ok_to_contact", false);

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    return { rows: (data as unknown as PersonRow[]) ?? [], total: count ?? 0 };
  } catch (err) {
    console.error("[admin] failed to load the People directory:", err);
    return null;
  }
}

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q);
  const segment = firstParam(sp.segment) || "all";
  const page = parsePage(sp.page);

  const result = await fetchPeople({ q, segment, page });
  const isFiltering = q !== "" || segment !== "all";

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (segment !== "all") params.segment = segment;

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          People
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          One row per person, deduplicated by email. Click a row to see their
          full history — inquiries, status changes, and orders — in one place.
        </p>
      </header>

      {result === null ? (
        <EmptyState connected={false} />
      ) : (
        <>
          <ListToolbar
            searchPlaceholder="Search by name, email, or company…"
            filterParam="segment"
            filterLabel="Filter by newsletter opt-in"
            options={[
              { value: "all", label: "All people" },
              { value: "opted-in", label: "Newsletter: opted in" },
              { value: "opted-out", label: "Newsletter: opted out" },
            ]}
          />

          {result.total === 0 ? (
            isFiltering ? (
              <NoMatch />
            ) : (
              <EmptyState connected />
            )
          ) : (
            <>
              <PeopleDirectory people={result.rows} />
              <Pagination
                page={page}
                total={result.total}
                pathname="/admin/people"
                params={params}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No people yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "Once someone submits the contact form, they'll show up here."
          : "The database isn't reachable yet. Set the environment variables and refresh."}
      </p>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No people match your filters
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        Try a different search term or segment.
      </p>
    </div>
  );
}
