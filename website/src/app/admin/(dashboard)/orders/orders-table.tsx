import {
  formatAmount,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderRow,
} from "@/lib/orders";
import { formatDate, initials } from "@/lib/leads";

/**
 * Presentational table for one server-fetched page of orders. Search, status
 * filtering, and pagination all now happen in the query (`orders/page.tsx`) via
 * URL params, so this component just renders the rows it's given — no client
 * state.
 */
export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
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
  );
}
