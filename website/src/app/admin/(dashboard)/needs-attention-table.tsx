/**
 * "Needs attention" table — open leads (status not won/lost) that have gone
 * quiet: no activity_log entry in 7+ days, falling back to the lead's
 * created_at when it has no activity yet (the same staleness fallback the leads
 * board uses). Each row deep-links into the lead drawer on `/admin/leads`.
 * Server-rendered; sorted most-idle first. `dashboard.ts` returns every
 * qualifying lead (no cap) and the subtitle below prints the live count, so
 * the operator always sees the true total — nothing is ever silently hidden.
 */
import Link from "next/link";
import { TYPE_LABELS } from "@/lib/leads";
import type { NeedsAttentionRow } from "@/lib/dashboard";
import { Card } from "./dashboard-widgets";

export function NeedsAttentionTable({ rows }: { rows: NeedsAttentionRow[] }) {
  const subtitle =
    rows.length === 0
      ? "Open leads with no movement in 7+ days — oldest first"
      : `${rows.length} open lead${rows.length === 1 ? "" : "s"} with no movement in 7+ days — oldest first`;

  return (
    <Card title="Needs attention" subtitle={subtitle}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--gray-2)]">
          Nothing stale — every open lead has moved in the last week.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--rule)] text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-1)]">
                <th className="py-2.5 pr-4">Person</th>
                <th className="py-2.5 pr-4">Type</th>
                <th className="py-2.5 pr-4">Stage</th>
                <th className="py-2.5 pr-4 text-right">Idle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const idleColor = row.idleDays >= 10 ? "var(--red)" : "var(--amber)";
                const idleBg = row.idleDays >= 10 ? "var(--red-soft)" : "var(--amber-soft)";
                return (
                  <tr key={row.id} className="border-b border-[var(--rule)] last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/leads?lead=${row.id}`}
                        className="block max-w-[240px]"
                      >
                        <span className="block truncate text-[14px] font-medium text-[var(--ink)] hover:text-[var(--blue)]">
                          {row.name}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--gray-1)]">
                          {row.email}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-[13px] text-[var(--ink)]">
                      {TYPE_LABELS[row.type] ?? row.type}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink)]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: row.statusColor }}
                        />
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                        style={{ color: idleColor, background: idleBg }}
                      >
                        {row.idleDays}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
