/**
 * Builds the data for the internal daily digest email (BUILD 3, part 4) —
 * pure data shaping, no Supabase/Resend imports, so it's easy to reason about
 * and test independently of the cron route that fetches + sends it.
 *
 * Reuses the exact same funnel/staleness math as the dashboard
 * (`lib/pipeline.ts`) so the email and the screen can never disagree about
 * which leads are stale or what the conversion numbers are.
 */
import { STATUS_COLORS, STATUS_LABELS, type ActivityLogRow, type LeadRow } from "@/lib/leads";
import {
  DAY,
  countInWindow,
  deltaText,
  formatUsd,
  buildFunnelStats,
  buildDigestStaleLeads,
  type StaleLeadForDigest,
} from "@/lib/pipeline";

export type DigestKpi = {
  label: string;
  value: string;
  deltaText: string;
  positive: boolean;
};

export type DigestFunnelStage = {
  label: string;
  count: number;
  color: string;
  conversionText: string;
};

export type DigestData = {
  dateLabel: string;
  kpis: DigestKpi[];
  funnel: DigestFunnelStage[];
  critical: StaleLeadForDigest[];
  warning: StaleLeadForDigest[];
  totalStale: number;
};

type OrderRow = { amount_cents: number; status: string; created_at: string };

function monthRevenue(orders: OrderRow[], monthsAgo: number, now: number): number {
  const ref = new Date(now);
  const start = new Date(ref.getFullYear(), ref.getMonth() - monthsAgo, 1).getTime();
  const end = new Date(ref.getFullYear(), ref.getMonth() - monthsAgo + 1, 1).getTime();
  return orders
    .filter((o) => o.status === "paid")
    .filter((o) => {
      const t = Date.parse(o.created_at);
      return t >= start && t < end;
    })
    .reduce((sum, o) => sum + o.amount_cents, 0);
}

export function buildDigestData(
  leads: LeadRow[],
  activity: ActivityLogRow[],
  orders: OrderRow[],
  now: number
): DigestData {
  const WEEK = 7 * DAY;
  const weekStart = now - WEEK;
  const twoWeeksStart = now - 2 * WEEK;

  // New leads this week vs last week.
  const newCur = countInWindow(leads, weekStart, now);
  const newPrev = countInWindow(leads, twoWeeksStart, weekStart);
  const newLeadsDelta = deltaText(newCur, newPrev, "vs last week");

  // Open pipeline: current snapshot count, delta framed the same way the
  // dashboard's KPI row does — new open leads this week vs the week before —
  // so the two surfaces never show contradictory deltas for the same metric.
  const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const openCur = countInWindow(open, weekStart, now);
  const openPrev = countInWindow(open, twoWeeksStart, weekStart);
  const openDelta = deltaText(openCur, openPrev, "vs last week");

  // Revenue this calendar month vs last.
  const revCur = monthRevenue(orders, 0, now);
  const revPrev = monthRevenue(orders, 1, now);
  const revDelta = deltaText(revCur, revPrev, "vs last month");

  const kpis: DigestKpi[] = [
    {
      label: "New leads this week",
      value: String(newCur),
      deltaText: newLeadsDelta.text,
      positive: newLeadsDelta.delta >= 0,
    },
    {
      label: "Open pipeline",
      value: String(open.length),
      deltaText: openDelta.text,
      positive: openDelta.delta >= 0,
    },
    {
      label: "Revenue this month",
      value: formatUsd(revCur),
      deltaText: revDelta.text,
      positive: revDelta.delta >= 0,
    },
  ];

  const funnelStats = buildFunnelStats(leads, activity);
  const funnel: DigestFunnelStage[] = funnelStats.map((s) => ({
    label: STATUS_LABELS[s.key] ?? s.key,
    count: s.count,
    color: STATUS_COLORS[s.key] === "var(--gray-1)" ? "#86868b" : cssVarToHex(STATUS_COLORS[s.key]),
    conversionText:
      s.conversionFromPrev === null ? "—" : `${s.conversionFromPrev}% from prior stage`,
  }));

  const { critical, warning } = buildDigestStaleLeads(leads, activity, STATUS_LABELS, now);

  const dateLabel = new Date(now).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    dateLabel,
    kpis,
    funnel,
    critical,
    warning,
    totalStale: critical.length + warning.length,
  };
}

/** Email clients don't resolve CSS custom properties — map the same
 * `STATUS_COLORS` tokens used on the dashboard to their literal hex values
 * (from `globals.css`) so the digest funnel visually matches the screen. */
function cssVarToHex(cssVar: string): string {
  const map: Record<string, string> = {
    "var(--blue)": "#0071e3",
    "var(--purple)": "#5e5ce6",
    "var(--teal)": "#30b0c7",
    "var(--amber)": "#ff9500",
    "var(--green)": "#34c759",
    "var(--gray-1)": "#86868b",
  };
  return map[cssVar] ?? "#86868b";
}
