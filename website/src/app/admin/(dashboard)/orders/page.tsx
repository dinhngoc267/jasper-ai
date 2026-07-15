import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  formatAmount,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderRow,
} from "@/lib/orders";
import { formatDate, initials } from "@/lib/leads";
import { OrderForm } from "./order-form";

// Render on every request — never at build time (there is no database during
// `next build`). Same pattern as the leads/people/newsletter pages.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders — Jasper AI Admin",
};

/** Fetch orders newest-first, joined to the person who bought. Returns null
 * (not throws) if the DB or the 0003 migration isn't reachable yet. */
async function fetchOrders(): Promise<OrderRow[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, person_id, product_name, amount_cents, currency, status, created_at, people ( id, name, email )"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as OrderRow[]) ?? [];
  } catch (err) {
    console.error("[admin] failed to load orders:", err);
    return null;
  }
}

export default async function AdminOrdersPage() {
  const orders = await fetchOrders();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Orders
        </h1>
        <p className="mt-2 text-[var(--gray-2)]">
          What people bought. Add an order against an existing person by
          their email — it also shows up on their record in People.
        </p>
      </header>

      <div className="mb-8">
        <OrderForm />
      </div>

      {orders === null ? (
        <EmptyState connected={false} />
      ) : orders.length === 0 ? (
        <EmptyState connected />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--rule)] bg-[var(--paper)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--rule)] text-xs uppercase tracking-wider text-[var(--gray-2)]">
                <th className="px-4 py-3 font-semibold">Person</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const style = ORDER_STATUS_STYLES[order.status];
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--rule)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--ink-soft)] text-xs font-semibold text-white">
                          {initials(order.people?.name)}
                        </span>
                        <div>
                          <p className="font-medium text-[var(--ink)]">
                            {order.people?.name || "—"}
                          </p>
                          <p className="text-xs text-[var(--gray-2)]">
                            {order.people?.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink)]">
                      {order.product_name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                      {formatAmount(order.amount_cents, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                        style={{ background: style?.bg, color: style?.color }}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-2)]">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
          ? "Add an order above and it will appear here."
          : "The database isn't reachable yet, or migration 0003 hasn't been run. Run it in Supabase and set the environment variables, then refresh."}
      </p>
    </div>
  );
}
