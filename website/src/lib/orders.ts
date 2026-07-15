/**
 * Shared types, labels, and formatting for the admin Orders page.
 *
 * Deliberately has NO server-only imports (no `@/lib/supabase/server`) — same
 * pattern as `@/lib/leads` — so it can be imported from both the
 * server-fetching page and its client components without pulling
 * server-only code into the client bundle.
 */

/** One row in `orders`, joined to the person it belongs to. */
export type OrderRow = {
  id: string;
  person_id: string;
  product_name: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  people: { id: string; name: string | null; email: string } | null;
};

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** Per-status badge background + text color, matching the design mock's
 * order-status pill treatment. */
export const ORDER_STATUS_STYLES: Record<
  string,
  { bg: string; color: string }
> = {
  pending: { bg: "var(--amber-soft)", color: "#c26a00" },
  paid: { bg: "var(--green-soft)", color: "#1a7a34" },
  refunded: { bg: "var(--gray-soft)", color: "var(--gray-2)" },
  cancelled: { bg: "var(--red-soft)", color: "#c0392b" },
};

/** `amount_cents` + `currency` -> "$1,200.00". Falls back to a plain
 * cents-based display for currencies `Intl.NumberFormat` doesn't recognize. */
export function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
