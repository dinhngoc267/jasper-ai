import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderRow } from "@/lib/orders";
import { firstParam, parsePage, sanitizeSearch } from "@/lib/search";
import { ListToolbar } from "../list-toolbar";
import { PAGE_SIZE, Pagination } from "../pagination";
import { OrderForm } from "./order-form";
import { OrdersTable } from "./orders-table";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/people/newsletter pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders — Jasper AI Admin",
};

type OrdersResult = { rows: OrderRow[]; total: number };

/**
 * Fetch ONE page of orders, newest-first, joined to the buyer — with search
 * and status filter applied in the query (never client-side over the whole
 * table). Returns null (not throws) if the DB / migration 0003 is unreachable.
 *
 * Search spans the product name AND the joined person's name/email. Filtering
 * across a to-one embedded table in a single `.or()` is a supabase-js footgun,
 * so we do it in two safe steps: look up the matching person ids first, then
 * `.or(product_name.ilike…, person_id.in.(…))` on orders. Verified against the
 * live DB (searching "Elena" returns exactly her 2 orders).
 */
async function fetchOrders({
  q,
  status,
  page,
}: {
  q: string;
  status: string;
  page: number;
}): Promise<OrdersResult | null> {
  try {
    const supabase = getSupabaseAdmin();
    const term = sanitizeSearch(q);

    let personIds: string[] = [];
    if (term) {
      const { data: matches, error: peopleError } = await supabase
        .from("people")
        .select("id")
        .or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      if (peopleError) throw peopleError;
      personIds = (matches ?? []).map((p) => p.id as string);
    }

    let query = supabase
      .from("orders")
      .select(
        "id, person_id, product_name, amount_cents, currency, status, created_at, people ( id, name, email )",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);

    if (term) {
      const orParts = [`product_name.ilike.%${term}%`];
      if (personIds.length > 0) {
        orParts.push(`person_id.in.(${personIds.join(",")})`);
      }
      query = query.or(orParts.join(","));
    }

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    return { rows: (data as unknown as OrderRow[]) ?? [], total: count ?? 0 };
  } catch (err) {
    console.error("[admin] failed to load orders:", err);
    return null;
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q);
  const status = firstParam(sp.status) || "all";
  const page = parsePage(sp.page);

  const result = await fetchOrders({ q, status, page });
  const isFiltering = q !== "" || status !== "all";

  // Params to preserve across page links (page itself is set by Pagination).
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (status !== "all") params.status = status;

  return (
    <div>
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Orders
          </h1>
          <p className="mt-2 text-[var(--gray-2)]">
            What people bought. Add an order against an existing person by their
            email — it also shows up on their record in People.
          </p>
        </div>
        <OrderForm />
      </header>

      {result === null ? (
        <EmptyState connected={false} />
      ) : (
        <>
          <ListToolbar
            searchPlaceholder="Search by person, email, or product…"
            filterParam="status"
            filterLabel="Filter by status"
            options={[
              { value: "all", label: "All statuses" },
              ...ORDER_STATUSES.map((s) => ({
                value: s,
                label: ORDER_STATUS_LABELS[s],
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
              <OrdersTable orders={result.rows} />
              <Pagination
                page={page}
                total={result.total}
                pathname="/admin/orders"
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
        No orders yet or database not connected
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        {connected
          ? "Use “Add order” in the top right to record your first one."
          : "The database isn't reachable yet, or migration 0003 hasn't been run. Run it in Supabase and set the environment variables, then refresh."}
      </p>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-8 py-16 text-center">
      <p className="text-lg font-medium text-[var(--ink)]">
        No orders match your filters
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gray-2)]">
        Try a different search term or status.
      </p>
    </div>
  );
}
