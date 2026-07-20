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
  type LeadRow,
} from "@/lib/leads";
import { PERIOD_META, type Period } from "@/lib/period";
import {
  DAY,
  countInWindow,
  dayStart,
  deltaText,
  formatUsd,
  buildFunnelStats,
  buildSourceQuality,
  computeStaleness,
  type ContactMetadata,
  type SourceQualityRow,
} from "@/lib/pipeline";

// Re-export the client-safe period helpers so server consumers can import
// everything dashboard-related from one place.
export { PERIODS, PERIOD_META, parsePeriod, type Period } from "@/lib/period";
export { formatUsd } from "@/lib/pipeline";
export type { SourceQualityRow } from "@/lib/pipeline";

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
export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  color: string;
  /** % of the previous stage's count that reached this stage; null for the
   * first stage. Derived from activity_log history — see `buildFunnelStats`
   * in `lib/pipeline.ts`. */
  conversionFromPrev: number | null;
  /** Median days spent in this stage, from completed stays only; null when
   * no contact has ever exited it yet. */
  medianDaysInStage: number | null;
};
export type RevenueBar = { label: string; cents: number };
export type SourceBar = { label: string; count: number };
export type LeadsVsWonPoint = { label: string; leads: number; won: number };
export type ContentAttributionRow = {
  landingPage: string;
  leadCount: number;
  winRate: number;
  revenueCents: number;
};
export type NeedsAttentionRow = {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  idleDays: number;
  thresholdDays: number;
};

export type DashboardData = {
  kpis: Kpi[];
  leadsOverTime: TimePoint[];
  leadsVsWon: LeadsVsWonPoint[];
  funnel: FunnelStage[];
  revenue: RevenueBar[];
  sources: SourceBar[];
  sourceQuality: SourceQualityRow[];
  contentAttribution: ContentAttributionRow[];
  needsAttention: NeedsAttentionRow[];
  /** Full lead rows for the contacts in `needsAttention`, in the same shape
   * the Leads page's drawer expects — lets the dashboard render the exact
   * same `LeadDrawer` in place instead of navigating away. */
  needsAttentionLeads: LeadRow[];
  /** activity_log rows scoped to those same contacts. */
  needsAttentionActivity: ActivityLogRow[];
};

// ── Raw row shapes (minimal columns) ─────────────────────────────────────────
type ContactRow = {
  id: string;
  person_id: string;
  type: string;
  subject: string | null;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  people: {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    attributes: { how_they_heard?: string } | null;
    created_at: string;
  } | null;
};
type OrderRow = { person_id: string; amount_cents: number; status: string; created_at: string };
type PersonRow = {
  id: string;
  ok_to_contact: boolean;
  created_at: string;
  attributes: { how_they_heard?: string } | null;
};


// ── Bucketing helpers ─────────────────────────────────────────────────────────
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
 * Leads created vs. won — bucket granularity reflows to the period toggle,
 * same pattern as `buildRevenue` below: week -> weekly buckets (~10 weeks),
 * month/quarter -> monthly or quarterly buckets respectively. Two series
 * sharing one count axis on purpose: leads created per bucket (a flow), and
 * won deals cumulative all-time (a running total) — deliberately not a
 * dual-axis chart, since overlaying two different scales invites false
 * visual correlation. A contact's "won at" timestamp is the earliest
 * activity_log row transitioning it `to_status: "won"`; contacts that are
 * currently won but have no such row (e.g. seeded pre-BUILD-3) fall back to
 * their `created_at` so they still count somewhere rather than vanishing.
 */
function buildLeadsVsWon(
  contacts: ContactRow[],
  activity: ActivityLogRow[],
  period: Period,
  now: number
): LeadsVsWonPoint[] {
  const todayStart = dayStart(now);
  const anchorEnd = todayStart + DAY;

  const wonAt = new Map<string, number>();
  for (const c of contacts) {
    if (c.status === "won") wonAt.set(c.id, Date.parse(c.created_at));
  }
  for (const a of activity) {
    if (a.to_status !== "won" || !wonAt.has(a.contact_id)) continue;
    const t = Date.parse(a.created_at);
    if (t < wonAt.get(a.contact_id)!) wonAt.set(a.contact_id, t);
  }
  const wonTimestamps = [...wonAt.values()].sort((a, b) => a - b);

  const points: LeadsVsWonPoint[] = [];

  if (period === "month") {
    // Monthly buckets — last 6 calendar months, matching `buildRevenue`'s
    // month/quarter window for consistency across the two charts.
    const ref = new Date(now);
    for (let m = 5; m >= 0; m--) {
      const start = new Date(ref.getFullYear(), ref.getMonth() - m, 1).getTime();
      const end = new Date(ref.getFullYear(), ref.getMonth() - m + 1, 1).getTime();
      const leads = countInWindow(contacts, start, end);
      const won = wonTimestamps.filter((t) => t < end).length;
      points.push({
        label: new Date(start).toLocaleDateString("en-US", { month: "short" }),
        leads,
        won,
      });
    }
    return points;
  }

  if (period === "quarter") {
    // Quarterly buckets — last 6 calendar quarters.
    const ref = new Date(now);
    const refQuarter = Math.floor(ref.getMonth() / 3);
    for (let q = 5; q >= 0; q--) {
      const totalQuarters = ref.getFullYear() * 4 + refQuarter - q;
      const year = Math.floor(totalQuarters / 4);
      const quarter = totalQuarters % 4;
      const start = new Date(year, quarter * 3, 1).getTime();
      const end = new Date(year, quarter * 3 + 3, 1).getTime();
      const leads = countInWindow(contacts, start, end);
      const won = wonTimestamps.filter((t) => t < end).length;
      points.push({ label: `Q${quarter + 1} '${String(year).slice(2)}`, leads, won });
    }
    return points;
  }

  // Week (default) — weekly buckets, last 10 weeks.
  const WEEKS = 10;
  for (let w = WEEKS - 1; w >= 0; w--) {
    const end = anchorEnd - w * 7 * DAY;
    const start = end - 7 * DAY;
    const leads = countInWindow(contacts, start, end);
    const won = wonTimestamps.filter((t) => t < end).length;
    points.push({ label: shortDate(start), leads, won });
  }
  return points;
}

/**
 * Conversion funnel — an all-time snapshot of the furthest stage each lead has
 * reached (no period dimension: a funnel is "who is in my pipeline right now",
 * not "what happened this week"; see the design notes). Stage-to-stage
 * conversion rates and median time-in-stage are computed in `lib/pipeline.ts`
 * (the shared `buildFunnelStats`, also used by the digest email); this just
 * joins in the display label/color.
 */
function buildFunnel(contacts: ContactRow[], activity: ActivityLogRow[]): FunnelStage[] {
  const stats = buildFunnelStats(contacts, activity);
  return stats.map((s) => ({
    key: s.key,
    label: STATUS_LABELS[s.key] ?? s.key,
    count: s.count,
    color: STATUS_COLORS[s.key],
    conversionFromPrev: s.conversionFromPrev,
    medianDaysInStage: s.medianDaysInStage,
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

/**
 * Content attribution — same aggregation shape as `buildSourceQuality`
 * (lead count, win rate, revenue), grouped by the first-touch
 * `metadata.landing_page` blog slug instead of source. Answers "does this
 * specific post produce leads that close?". Only contacts whose captured
 * landing page is a blog post (`/blog/<slug>`) are included; everything
 * else (direct, non-blog pages) has no row here since there's no post to
 * attribute it to. Revenue attribution mirrors `buildSourceQuality`: a
 * person's paid orders are attributed to their FIRST contact's landing
 * page.
 */
function buildContentAttribution(
  contacts: ContactRow[],
  orders: OrderRow[]
): ContentAttributionRow[] {
  function slugFor(c: ContactRow): string | null {
    const landingPage = (c.metadata as ContactMetadata | null)?.landing_page;
    if (!landingPage?.startsWith("/blog/")) return null;
    return landingPage.replace(/^\/blog\//, "").replace(/\/$/, "");
  }

  const firstContactByPerson = new Map<string, ContactRow>();
  for (const c of contacts) {
    const existing = firstContactByPerson.get(c.person_id);
    if (!existing || Date.parse(c.created_at) < Date.parse(existing.created_at)) {
      firstContactByPerson.set(c.person_id, c);
    }
  }

  const bySlug = new Map<string, { leadCount: number; won: number; revenueCents: number }>();
  for (const c of contacts) {
    const slug = slugFor(c);
    if (!slug) continue;
    const entry = bySlug.get(slug) ?? { leadCount: 0, won: 0, revenueCents: 0 };
    entry.leadCount++;
    if (c.status === "won") entry.won++;
    bySlug.set(slug, entry);
  }

  const personSlug = new Map<string, string>();
  for (const [personId, contact] of firstContactByPerson) {
    const slug = slugFor(contact);
    if (slug) personSlug.set(personId, slug);
  }
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const slug = personSlug.get(o.person_id);
    if (!slug) continue;
    const entry = bySlug.get(slug) ?? { leadCount: 0, won: 0, revenueCents: 0 };
    entry.revenueCents += o.amount_cents;
    bySlug.set(slug, entry);
  }

  return [...bySlug.entries()]
    .map(([landingPage, v]) => ({
      landingPage,
      leadCount: v.leadCount,
      winRate: v.leadCount > 0 ? Math.round((v.won / v.leadCount) * 100) : 0,
      revenueCents: v.revenueCents,
    }))
    .sort((a, b) => b.leadCount - a.leadCount);
}

/**
 * Open leads past their PER-STAGE staleness threshold (part 4's tunable
 * defaults: new_lead > 2 days, contacted > 4 days, discovery_call/proposal
 * > 7 days) — see `computeStaleness` in `lib/pipeline.ts`, the single source
 * of truth shared with the daily digest so the dashboard and the email agree
 * on exactly which leads are stale.
 */
function buildNeedsAttention(
  contacts: ContactRow[],
  activity: ActivityLogRow[],
  now: number
): NeedsAttentionRow[] {
  const staleness = computeStaleness(contacts, activity, now);

  const rows: NeedsAttentionRow[] = [];
  for (const s of staleness) {
    if (!s.isStale) continue;
    const c = contacts.find((x) => x.id === s.id);
    if (!c) continue;
    rows.push({
      id: c.id,
      name: c.people?.name || "—",
      email: c.people?.email || "—",
      type: c.type,
      status: c.status,
      statusLabel: STATUS_LABELS[c.status] ?? c.status,
      statusColor: STATUS_COLORS[c.status] ?? "var(--gray-1)",
      idleDays: s.idleDays,
      thresholdDays: s.thresholdDays,
    });
  }
  rows.sort((a, b) => b.idleDays - a.idleDays);
  // No cap: at this data volume (tens of rows, per the file header) an
  // operator must never see a truncated list with no indication that rows
  // are missing. `needs-attention-table.tsx` renders every row returned here
  // and prints the total count, so nothing is ever silently hidden.
  return rows;
}

/** Full `LeadRow`-shaped contacts for a set of ids, for the dashboard's
 * in-place lead drawer (part 2). */
function toLeadRows(contacts: ContactRow[], ids: Set<string>): LeadRow[] {
  return contacts
    .filter((c) => ids.has(c.id))
    .map((c) => ({
      id: c.id,
      person_id: c.person_id,
      type: c.type,
      subject: c.subject,
      message: c.message,
      source: c.source,
      status: c.status,
      created_at: c.created_at,
      metadata: c.metadata as LeadRow["metadata"],
      people: c.people,
    }));
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
 * ignores `period`; the KPIs, leads-over-time, leads-vs-won chart, and revenue
 * chart all reflow to the selected window.
 */
/** Independent period per time-series widget — each chart owns its own toggle,
 * so revenue can be viewed by month while leads-vs-won is by week. The funnel
 * and content attribution remain snapshots (no period); source performance is
 * a lead-cohort view (leads created in `source`'s window). */
export type DashboardPeriods = {
  kpi: Period;
  leads: Period;
  revenue: Period;
  source: Period;
};

export async function fetchDashboardData(
  periods: DashboardPeriods
): Promise<DashboardData> {
  const now = Date.now();
  const supabase = getSupabaseAdmin();

  const [contacts, activity, orders, people] = await Promise.all([
    safe(
      async () => {
        const { data, error } = await supabase
          .from("contacts")
          .select(
            "id, person_id, type, subject, message, source, status, created_at, metadata, people ( id, name, email, company, attributes, created_at )"
          );
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
          .select("person_id, amount_cents, status, created_at");
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
          .select("id, ok_to_contact, created_at, attributes");
        if (error) throw error;
        return (data as unknown as PersonRow[]) ?? [];
      },
      "people",
      [] as PersonRow[]
    ),
  ]);

  const needsAttention = buildNeedsAttention(contacts, activity, now);
  const needsAttentionIds = new Set(needsAttention.map((r) => r.id));
  const needsAttentionLeads = toLeadRows(contacts, needsAttentionIds);
  const needsAttentionActivity = activity.filter((a) => needsAttentionIds.has(a.contact_id));

  // Source performance is a lead cohort scoped to its own toggle: leads created
  // in the trailing [now - days, now) window (same convention as the KPIs).
  const sourceWindow = {
    start: now - PERIOD_META[periods.source].days * DAY,
    end: now,
  };

  return {
    kpis: buildKpis(contacts, orders, people, periods.kpi, now),
    leadsOverTime: buildLeadsOverTime(contacts, periods.leads, now),
    leadsVsWon: buildLeadsVsWon(contacts, activity, periods.leads, now),
    funnel: buildFunnel(contacts, activity),
    revenue: buildRevenue(orders, periods.revenue, now),
    sources: buildSources(people),
    sourceQuality: buildSourceQuality(
      contacts as unknown as Parameters<typeof buildSourceQuality>[0],
      people,
      orders,
      sourceWindow
    ),
    contentAttribution: buildContentAttribution(contacts, orders),
    needsAttention,
    needsAttentionLeads,
    needsAttentionActivity,
  };
}
