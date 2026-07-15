/**
 * Client-safe period constants for the dashboard's Week/Month/Quarter toggle.
 *
 * Split out from `dashboard.ts` (which imports the server-only Supabase client)
 * so the client `period-toggle.tsx` can import these without dragging
 * server-only code into the browser bundle — the same "no server imports"
 * discipline used by `@/lib/leads`.
 */
export const PERIODS = ["week", "month", "quarter"] as const;
export type Period = (typeof PERIODS)[number];

type PeriodMeta = { label: string; days: number; compare: string };

export const PERIOD_META: Record<Period, PeriodMeta> = {
  week: { label: "Week", days: 7, compare: "vs last week" },
  month: { label: "Month", days: 30, compare: "vs last month" },
  quarter: { label: "Quarter", days: 91, compare: "vs last quarter" },
};

/** Coerce an arbitrary `?period=` search param to a valid Period (default month). */
export function parsePeriod(value: string | string[] | undefined): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return (PERIODS as readonly string[]).includes(v ?? "")
    ? (v as Period)
    : "month";
}
