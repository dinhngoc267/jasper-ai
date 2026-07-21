import { getSupabaseAdmin } from "@/lib/supabase/server";
import { POST_STATUSES, POST_STATUS_LABELS, type PostRow } from "@/lib/posts";
import { firstParam, parsePage, sanitizeSearch } from "@/lib/search";
import { ListToolbar } from "../list-toolbar";
import { PAGE_SIZE, Pagination } from "../pagination";
import { ContentTable } from "./content-table";

// Render on every request — never at build time (there is no database
// during `next build`). Same pattern as the other admin list pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content — Jasper AI Admin",
};

type ContentResult = { rows: PostRow[]; total: number };

async function fetchPosts({
  q,
  status,
  page,
}: {
  q: string;
  status: string;
  page: number;
}): Promise<ContentResult | null> {
  try {
    const supabase = getSupabaseAdmin();
    const term = sanitizeSearch(q);

    let query = supabase
      .from("posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (term) query = query.or(`slug.ilike.%${term}%,title.ilike.%${term}%`);

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    return { rows: (data as PostRow[]) ?? [], total: count ?? 0 };
  } catch (err) {
    console.error("[admin] failed to load posts:", err);
    return null;
  }
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q);
  const status = firstParam(sp.status) || "all";
  const page = parsePage(sp.page);

  const result = await fetchPosts({ q, status, page });
  const isFiltering = q !== "" || status !== "all";

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (status !== "all") params.status = status;

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Content
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          Blog posts written by the weekly routine, ready for review. Publish
          takes one live instantly — no PR or deploy.
        </p>
      </header>

      {result === null ? (
        <EmptyState connected={false} />
      ) : (
        <>
          <ListToolbar
            searchPlaceholder="Search by title or slug…"
            filterParam="status"
            filterLabel="Filter by status"
            options={[
              { value: "all", label: "All statuses" },
              ...POST_STATUSES.map((s) => ({
                value: s,
                label: POST_STATUS_LABELS[s],
              })),
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
              <ContentTable posts={result.rows} />
              <Pagination
                page={page}
                total={result.total}
                pathname="/admin/content"
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
        No content yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "New briefs show up here once the channel-signal routine writes one."
          : "The database isn't reachable yet, or migration 0004 hasn't been run. Run it in Supabase and set the environment variables, then refresh."}
      </p>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No content matches your filters
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        Try a different search term or status.
      </p>
    </div>
  );
}
