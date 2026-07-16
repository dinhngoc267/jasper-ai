/**
 * Aggregate queries + shaping for the admin Dashboard (`/admin`).
 *
 * This file DOES import the server-only Supabase client, so it must only ever
 * be imported from Server Components (the dashboard `page.tsx` and its
 * server-rendered chart/table components). The period toggle is the one client
 * component on the page and it imports nothing from here except the plain
 * `Period` string union / `PERIODS` list below, which carry no server code.
 *
 * Data volume is tiny (tens of rows), so every metric is computed by pulling
 * the relevant columns once and aggregating in JS — readable, and cheaper than
 * a fan-out of `count`/`group by` round-trips. Every fetch degrades to an
 * empty array on failure (never throws), matching the defensive style of
 * `fetchLeads`/`fetchActivityLog` in the leads page.
 */
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type ActivityLogRow,
} from "@/lib/leads";
import { PERIOD_META, type Period } from "@/lib/period";

// Re-export the client-safe period helpers so server consumers can import
// everything dashboard-related from one place.
export { PERIODS, PERIOD_META, parsePeriod, type Period } from "@/lib/period";

const DAY = 24 * 60 * 60 * 1000;

// ── Public shapes ─────────────────────────────────────────────────────────────
export type Kpi = {
  key: string;
  label: string;
  /** Preformatted display value, e.g. "$89,000" or "25". */
  value: string;
  /** Signed change vs the prior comparable window; null when no baseline. */
  delta: number | null;
  /** Human-readable delta, e.g. "+140% vs last month" or "+3 vs last week". */
  deltaText: string;
};

export type TimePoint = { label: string; value: number };
export type FunnelStage = { key: string; label: string; count: number; color: string };
export type RevenueBar = { label: string; cents: number };
export type SourceBar = { label: string; count: number };
export type NeedsAttentionRow = {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  idleDays: number;
};

export type DashboardData = {
  kpis: Kpi[];
  leadsOverTime: TimePoint[];
  funnel: FunnelStage[];
  revenue: RevenueBar[];
  sources: SourceBar[];
  needsAttention: NeedsAttentionRow[];
};

// ── Raw row shapes (minimal columns) ─────────────────────────────────────────
type ContactRow = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  people: { name: string | null; email: string } | null;
};
type OrderRow = { amount_cents: number; status: string; created_at: string };
type PersonRow = {
  ok_to_contact: boolean;
  created_at: string;
  attributes: { how_they_heard?: string } | null;
};

// ── Formatting ────────────────────────────────────────────────────────────────
/** Whole-dollar display from cents, e.g. 8900000 -> "$89,000". */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function deltaText(cur: number, prev: number, suffix: string): { delta: number; text: string } {
  const diff = cur - prev;
  if (prev === 0) {
    return { delta: diff, text: `${diff >= 0 ? "+" : ""}${diff} ${suffix}` };
  }
  const pct = Math.round((diff / prev) * 100);
  return { delta: diff, text: `${pct >= 0 ? "+" : ""}${pct}% ${suffix}` };
}

// ── Bucketing helpers ─────────────────────────────────────────────────────────
function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function countInWindow(rows: { created_at: string }[], startMs: number, endMs: number): number {
  let n = 0;
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (t >= startMs && t < endMs) n++;
  }
  return n;
}

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Metric builders ───────────────────────────────────────────────────────────
function buildKpis(
  contacts: ContactRow[],
  orders: OrderRow[],
  people: PersonRow[],
  period: Period,
  now: number
): Kpi[] {
  const { days, compare } = PERIOD_META[period];
  const win = days * DAY;
  const curStart = now - win;
  const prevStart = now - 2 * win;

  // New leads
  const newCur = countInWindow(contacts, curStart, now);
  const newPrev = countInWindow(contacts, prevStart, curStart);
  const nl = deltaText(newCur, newPrev, compare);

  // Open pipeline (snapshot) — delta = leads created this window that are still
  // open, vs the prior window, giving the chip a direction without pretending
  // to reconstruct historical pipeline state.
  const open = contacts.filter((c) => c.status !== "won" && c.status !== "lost");
  const openCount = open.length;
  const openNewCur = countInWindow(open, curStart, now);
  const openNewPrev = countInWindow(open, prevStart, curStart);
  const op = deltaText(openNewCur, openNewPrev, compare);

  // Revenue (paid orders in window)
  const paid = orders.filter((o) => o.status === "paid");
  const revCur = paid
    .filter((o) => { const t = Date.parse(o.created_at); return t >= curStart && t < now; })
    .reduce((s, o) => s + o.amount_cents, 0);
  const revPrev = paid
    .filter((o) => { const t = Date.parse(o.created_at); return t >= prevStart && t < curStart; })
    .reduce((s, o) => s + o.amount_cents, 0);
  const rv = deltaText(revCur, revPrev, compare);

  // Newsletter subscribers (total ok_to_contact) + new this window
  const subs = people.filter((p) => p.ok_to_contact);
  const subsTotal = subs.length;
  const subsCur = countInWindow(subs, curStart, now);
  const subsPrev = countInWindow(subs, prevStart, curStart);
  const sb = deltaText(subsCur, subsPrev, compare);

  return [
    { key: "leads", label: "New leads", value: String(newCur), delta: nl.delta, deltaText: nl.text },
    { key: "pipeline", label: "Open pipeline", value: String(openCount), delta: op.delta, deltaText: op.text },
    { key: "revenue", label: "Revenue", value: formatUsd(revCur), delta: rv.delta, deltaText: rv.text },
    { key: "subscribers", label: "Newsletter subscribers", value: String(subsTotal), delta: sb.delta, deltaText: sb.text },
  ];
}

function buildLeadsOverTime(contacts: ContactRow[], period: Period, now: number): TimePoint[] {
  const points: TimePoint[] = [];
  const todayStart = dayStart(now);

  if (period === "quarter") {
    // 13 weekly buckets ending today.
    const anchorEnd = todayStart + DAY;
    for (let w = 12; w >= 0; w--) {
      const end = anchorEnd - w * 7 * DAY;
      const start = end - 7 * DAY;
      points.push({ label: shortDate(start), value: countInWindow(contacts, start, end) });
    }
    return points;
  }

  const days = PERIOD_META[period].days; // 7 or 30
  for (let i = days - 1; i >= 0; i--) {
    const start = todayStart - i * DAY;
    const end = start + DAY;
    points.push({ label: shortDate(start), value: countInWindow(contacts, start, end) });
  }
  return points;
}

/**
 * Conversion funnel — fixed all-time snapshot, unaffected by the period toggle.
 * Each contact is counted at the FURTHEST stage it ever reached: the max rank
 * across its current status plus every from/to status in its activity_log
 * history. A contact at each stage is also counted at every earlier stage
 * (cumulative), and never double-counted within a stage.
 */
const FUNNEL_ORDER = ["new_lead", "contacted", "discovery_call", "proposal", "won"] as const;
const RANK: Record<string, number> = Object.fromEntries(
  FUNNEL_ORDER.map((s, i) => [s, i])
);

function buildFunnel(contacts: ContactRow[], activity: ActivityLogRow[]): FunnelStage[] {
  const byContact = new Map<string, string[]>();
  for (const c of contacts) byContact.set(c.id, [c.status]);
  for (const a of activity) {
    const list = byContact.get(a.contact_id);
    if (!list) continue; // activity for a contact we didn't load — ignore
    list.push(a.to_status);
    if (a.from_status) list.push(a.from_status);
  }

  const counts = FUNNEL_ORDER.map(() => 0);
  for (const statuses of byContact.values()) {
    let furthest = -1;
    for (const s of statuses) {
      const r = RANK[s];
      if (r !== undefined && r > furthest) furthest = r;
    }
    for (let i = 0; i <= furthest; i++) counts[i]++;
  }

  return FUNNEL_ORDER.map((key, i) => ({
    key,
    label: STATUS_LABELS[key] ?? key,
    count: counts[i],
    color: STATUS_COLORS[key],
  }));
}

function buildRevenue(orders: OrderRow[], period: Period, now: number): RevenueBar[] {
  const paid = orders.filter((o) => o.status === "paid");
  const bars: RevenueBar[] = [];

  if (period === "week") {
    // Last 7 days by day.
    const todayStart = dayStart(now);
    for (let i = 6; i >= 0; i--) {
      const start = todayStart - i * DAY;
      const end = start + DAY;
      const cents = paid
        .filter((o) => { const t = Date.parse(o.created_at); return t >= start && t < end; })
        .reduce((s, o) => s + o.amount_cents, 0);
      bars.push({ label: shortDate(start), cents });
    }
    return bars;
  }

  // Month / Quarter -> last 6 calendar months.
  const ref = new Date(now);
  for (let m = 5; m >= 0; m--) {
    const start = new Date(ref.getFullYear(), ref.getMonth() - m, 1).getTime();
    const end = new Date(ref.getFullYear(), ref.getMonth() - m + 1, 1).getTime();
    const cents = paid
      .filter((o) => { const t = Date.parse(o.created_at); return t >= start && t < end; })
      .reduce((s, o) => s + o.amount_cents, 0);
    bars.push({
      label: new Date(start).toLocaleDateString("en-US", { month: "short" }),
      cents,
    });
  }
  return bars;
}

/**
 * Lead-source mix — how people found us, all time. Groups by the stored
 * `how_they_heard` value directly: the contact form writes a fixed category
 * (dropdown) and existing rows were normalized in the DB, so no bucketing
 * happens here. Empty/unset values are ignored. Sorted most-common first.
 */
function buildSources(people: PersonRow[]): SourceBar[] {
  const counts = new Map<string, number>();
  for (const p of people) {
    const label = p.attributes?.how_they_heard?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function buildNeedsAttention(
  contacts: ContactRow[],
  activity: ActivityLogRow[],
  now: number
): NeedsAttentionRow[] {
  const lastActivityMs = new Map<string, number>();
  for (const a of activity) {
    const t = Date.parse(a.created_at);
    const prev = lastActivityMs.get(a.contact_id) ?? 0;
    if (t > prev) lastActivityMs.set(a.contact_id, t);
  }

  const rows: NeedsAttentionRow[] = [];
  for (const c of contacts) {
    if (c.status === "won" || c.status === "lost") continue;
    // Most recent activity, falling back to when the lead came in — the exact
    // staleness fallback used by the leads board (`lastTouchedMs` in leads.ts).
    const touched = lastActivityMs.get(c.id) ?? Date.parse(c.created_at);
    const idleDays = Math.floor((now - touched) / DAY);
    if (idleDays < 7) continue;
    rows.push({
      id: c.id,
      name: c.people?.name || "—",
      email: c.people?.email || "—",
      type: c.type,
      status: c.status,
      statusLabel: STATUS_LABELS[c.status] ?? c.status,
      statusColor: STATUS_COLORS[c.status] ?? "var(--gray-1)",
      idleDays,
    });
  }
  rows.sort((a, b) => b.idleDays - a.idleDays);
  // No cap: at this data volume (tens of rows, per the file header) an
  // operator must never see a truncated list with no indication that rows
  // are missing. `needs-attention-table.tsx` renders every row returned here
  // and prints the total count, so nothing is ever silently hidden.
  return rows;
}

// ── Fetching ──────────────────────────────────────────────────────────────────
async function safe<T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[admin/dashboard] ${label} unavailable:`, err);
    return fallback;
  }
}

/**
 * Load every dashboard metric for the given period. The funnel is all-time and
 * ignores `period`; the KPIs, leads-over-time, and revenue chart all reflow to
 * the selected window.
 */
export async function fetchDashboardData(period: Period): Promise<DashboardData> {
  const now = Date.now();
  const supabase = getSupabaseAdmin();

  const [contacts, activity, orders, people] = await Promise.all([
    safe(
      async () => {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, type, status, created_at, people ( name, email )");
        if (error) throw error;
        return (data as unknown as ContactRow[]) ?? [];
      },
      "contacts",
      [] as ContactRow[]
    ),
    safe(
      async () => {
        const { data, error } = await supabase
          .from("activity_log")
          .select("id, contact_id, from_status, to_status, actor, note, created_at");
        if (error) throw error;
        return (data as unknown as ActivityLogRow[]) ?? [];
      },
      "activity_log",
      [] as ActivityLogRow[]
    ),
    safe(
      async () => {
        const { data, error } = await supabase
          .from("orders")
          .select("amount_cents, status, created_at");
        if (error) throw error;
        return (data as unknown as OrderRow[]) ?? [];
      },
      "orders",
      [] as OrderRow[]
    ),
    safe(
      async () => {
        const { data, error } = await supabase
          .from("people")
          .select("ok_to_contact, created_at, attributes");
        if (error) throw error;
        return (data as unknown as PersonRow[]) ?? [];
      },
      "people",
      [] as PersonRow[]
    ),
  ]);

  return {
    kpis: buildKpis(contacts, orders, people, period, now),
    leadsOverTime: buildLeadsOverTime(contacts, period, now),
    funnel: buildFunnel(contacts, activity),
    revenue: buildRevenue(orders, period, now),
    sources: buildSources(people),
    needsAttention: buildNeedsAttention(contacts, activity, now),
  };
}
