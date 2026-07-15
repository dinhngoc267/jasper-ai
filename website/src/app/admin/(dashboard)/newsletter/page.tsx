import { getSupabaseAdmin } from "@/lib/supabase/server";
import { firstParam, parsePage, sanitizeSearch } from "@/lib/search";
import { ListToolbar } from "../list-toolbar";
import { PAGE_SIZE, Pagination } from "../pagination";
import { NewsletterTable, type NewsletterPerson } from "./newsletter-table";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/people/orders pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsletter — Jasper AI Admin",
};

type NewsletterResult = {
  rows: NewsletterPerson[];
  total: number;
  /** Distinct `how_they_heard` values across ALL subscribers (see below). */
  sources: string[];
};

/**
 * Fetch ONE page of subscribers (`ok_to_contact = true`), newest-first, with
 * search (name/email/company) and the "how they heard" filter applied in the
 * query. Returns null (not throws) if the DB is unreachable.
 *
 * The filter's option list can't be derived from the current page alone under
 * server pagination, so we run a second lightweight query for the distinct
 * `how_they_heard` values across all subscribers. It selects a single computed
 * text column and de-dupes in JS (PostgREST has no DISTINCT without an RPC) —
 * cheap at this scale (~21 rows, one column) and always in sync with the data.
 */
async function fetchSubscribers({
  q,
  heard,
  page,
}: {
  q: string;
  heard: string;
  page: number;
}): Promise<NewsletterResult | null> {
  try {
    const supabase = getSupabaseAdmin();
    const term = sanitizeSearch(q);

    // --- distinct "how they heard" options (all subscribers) ---
    const { data: heardRows, error: heardError } = await supabase
      .from("people")
      .select("how_they_heard:attributes->>how_they_heard")
      .eq("ok_to_contact", true);
    if (heardError) throw heardError;
    const sources = Array.from(
      new Set(
        (heardRows ?? [])
          .map((r) => (r as { how_they_heard: string | null }).how_they_heard)
          .filter((v): v is string => Boolean(v && v.trim()))
      )
    ).sort((a, b) => a.localeCompare(b));

    // --- the current page of subscribers ---
    let query = supabase
      .from("people")
      .select("id, name, email, company, attributes, created_at", {
        count: "exact",
      })
      .eq("ok_to_contact", true)
      .order("created_at", { ascending: false });

    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`
      );
    }
    if (heard !== "all") {
      query = query.eq("attributes->>how_they_heard", heard);
    }

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    return {
      rows: (data as unknown as NewsletterPerson[]) ?? [],
      total: count ?? 0,
      sources,
    };
  } catch (err) {
    console.error("[admin] failed to load newsletter subscribers:", err);
    return null;
  }
}

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q);
  const heard = firstParam(sp.heard) || "all";
  const page = parsePage(sp.page);

  const result = await fetchSubscribers({ q, heard, page });
  const isFiltering = q !== "" || heard !== "all";

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (heard !== "all") params.heard = heard;

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Newsletter
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          Everyone who opted in to occasional updates (
          <code className="font-mono text-xs">ok_to_contact = true</code>).
        </p>
      </header>

      {result === null ? (
        <EmptyState connected={false} />
      ) : (
        <>
          <ListToolbar
            searchPlaceholder="Search by name, email, or company…"
            filterParam="heard"
            filterLabel="Filter by how they heard"
            options={[
              { value: "all", label: "All sources" },
              ...result.sources.map((s) => ({ value: s, label: s })),
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
              <NewsletterTable people={result.rows} />
              <Pagination
                page={page}
                total={result.total}
                pathname="/admin/newsletter"
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
        No subscribers yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "Once someone opts in on the contact form, they'll show up here."
          : "The database isn't reachable yet. Set the environment variables and refresh."}
      </p>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No subscribers match your filters
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        Try a different search term or source.
      </p>
    </div>
  );
}
