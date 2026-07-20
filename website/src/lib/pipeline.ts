/**
 * Shared pipeline-insight math — used by both the admin Dashboard
 * (`lib/dashboard.ts`) and the internal daily digest (`lib/digest.ts`, sent
 * from `app/api/cron/digest/route.ts`). Kept in one place so "what counts as
 * stale" and "how conversion/median-time are computed" can never drift
 * between the screen the operator looks at and the email that nudges them.
 *
 * No server-only imports here — this is pure data shaping over already-
 * fetched rows, so it can be unit-tested and reused without dragging in the
 * Supabase client.
 */
import type { ActivityLogRow, LeadRow } from "@/lib/leads";

export const DAY = 24 * 60 * 60 * 1000;

/** Whole-dollar display from cents, e.g. 8900000 -> "$89,000". Lives here
 * (not `lib/dashboard.ts`) so client components (the needs-attention panel,
 * source-quality table) can import it without dragging the server-only
 * Supabase client into the browser bundle. */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

// ── Generic helpers (shared with dashboard.ts) ────────────────────────────────
export function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function countInWindow(
  rows: { created_at: string }[],
  startMs: number,
  endMs: number
): number {
  let n = 0;
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (t >= startMs && t < endMs) n++;
  }
  return n;
}

export function deltaText(
  cur: number,
  prev: number,
  suffix: string
): { delta: number; text: string } {
  const diff = cur - prev;
  if (prev === 0) {
    return { delta: diff, text: `${diff >= 0 ? "+" : ""}${diff} ${suffix}` };
  }
  const pct = Math.round((diff / prev) * 100);
  return { delta: diff, text: `${pct >= 0 ? "+" : ""}${pct}% ${suffix}` };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Funnel: stage order + per-stage staleness thresholds ─────────────────────
export const FUNNEL_ORDER = [
  "new_lead",
  "contacted",
  "discovery_call",
  "proposal",
  "won",
] as const;

export const RANK: Record<string, number> = Object.fromEntries(
  FUNNEL_ORDER.map((s, i) => [s, i])
);

/**
 * Staleness thresholds per open stage, in days — from BUILD 3's spec:
 * new_lead > 2 days untouched, contacted > 4 days, discovery_call/proposal
 * > 7 days. "Untouched" = no activity_log row since the last status
 * change/action (NOT falling back to created_at once a lead has ever had
 * activity — see `computeStaleness` below).
 */
export const STALE_THRESHOLD_DAYS: Record<string, number> = {
  new_lead: 2,
  contacted: 4,
  discovery_call: 7,
  proposal: 7,
};

export type MinimalContact = {
  id: string;
  status: string;
  created_at: string;
};

export type StalenessResult = {
  id: string;
  status: string;
  idleDays: number;
  thresholdDays: number;
  isStale: boolean;
};

/**
 * For every open (not won/lost) contact, compute days since it was last
 * touched and whether that exceeds its stage's threshold.
 *
 * "Last touched" = the most recent activity_log row for that contact if one
 * exists, else the contact's created_at (a lead with zero activity is
 * "untouched" since it arrived). Every action in part 2 (status change, note,
 * mark-followed-up) writes an activity_log row, so acting on a lead always
 * resets this clock — this is the one function both the dashboard's
 * needs-attention list and the digest's stale-lead grouping call, so they
 * can never disagree.
 */
export function computeStaleness(
  contacts: MinimalContact[],
  activity: ActivityLogRow[],
  now: number
): StalenessResult[] {
  const lastActivityMs = new Map<string, number>();
  for (const a of activity) {
    const t = Date.parse(a.created_at);
    const prev = lastActivityMs.get(a.contact_id) ?? 0;
    if (t > prev) lastActivityMs.set(a.contact_id, t);
  }

  const results: StalenessResult[] = [];
  for (const c of contacts) {
    if (c.status === "won" || c.status === "lost") continue;
    const thresholdDays = STALE_THRESHOLD_DAYS[c.status] ?? 7;
    const touched = lastActivityMs.get(c.id) ?? Date.parse(c.created_at);
    const idleDays = Math.floor((now - touched) / DAY);
    results.push({
      id: c.id,
      status: c.status,
      idleDays,
      thresholdDays,
      isStale: idleDays > thresholdDays,
    });
  }
  return results;
}

// ── Funnel conversion + median time-in-stage ──────────────────────────────────
export type FunnelStageStat = {
  key: string;
  count: number;
  /** % of the previous stage's count that reached this stage; null for the
   * first stage (nothing to convert from). */
  conversionFromPrev: number | null;
  /** Median days spent IN this stage, from completed (exited) stays only —
   * null when no contact has ever exited this stage yet. */
  medianDaysInStage: number | null;
};

export function buildFunnelStats(
  contacts: MinimalContact[],
  activity: ActivityLogRow[]
): FunnelStageStat[] {
  // Furthest-stage-reached counts (cumulative) — same semantics as the
  // pre-existing funnel: a contact is counted at every stage up to and
  // including the furthest one its status/history ever touched.
  const statusesByContact = new Map<string, string[]>();
  for (const c of contacts) statusesByContact.set(c.id, [c.status]);
  for (const a of activity) {
    const list = statusesByContact.get(a.contact_id);
    if (!list) continue;
    list.push(a.to_status);
    if (a.from_status) list.push(a.from_status);
  }

  const counts = FUNNEL_ORDER.map(() => 0);
  for (const statuses of statusesByContact.values()) {
    let furthest = -1;
    for (const s of statuses) {
      const r = RANK[s];
      if (r !== undefined && r > furthest) furthest = r;
    }
    for (let i = 0; i <= furthest; i++) counts[i]++;
  }

  // Completed stage-durations, per contact, from ordered activity history.
  const eventsByContact = new Map<string, ActivityLogRow[]>();
  for (const a of activity) {
    (eventsByContact.get(a.contact_id) ?? eventsByContact.set(a.contact_id, []).get(a.contact_id)!).push(a);
  }
  for (const events of eventsByContact.values()) {
    events.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  }

  const durationsByStage: Record<string, number[]> = {};
  for (const c of contacts) {
    const events = eventsByContact.get(c.id) ?? [];
    let stage = "new_lead";
    let stageStart = Date.parse(c.created_at);
    for (const ev of events) {
      const t = Date.parse(ev.created_at);
      if (ev.from_status && ev.from_status !== ev.to_status) {
        const key = ev.from_status ?? stage;
        (durationsByStage[key] ??= []).push(Math.max(0, t - stageStart));
        stage = ev.to_status;
        stageStart = t;
      }
      // from_status === to_status (a note / mark-followed-up action) does
      // not end the stage — the clock for time-in-stage keeps running from
      // the same stageStart.
    }
  }

  return FUNNEL_ORDER.map((key, i) => ({
    key,
    count: counts[i],
    conversionFromPrev:
      i === 0 ? null : counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0,
    medianDaysInStage: (() => {
      const m = median(durationsByStage[key] ?? []);
      return m === null ? null : Math.round((m / DAY) * 10) / 10;
    })(),
  }));
}

// ── Source capture + source-quality table ─────────────────────────────────────
export type ContactMetadata = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_page?: string;
};

/**
 * The true captured source label for a contact, combining UTM data, referrer
 * hostname, and first-touch landing page (including a blog slug) into one
 * human-readable string. Falls back to null when no client-side capture data
 * made it through (e.g. a contact seeded before BUILD 3, or JS was blocked).
 */
export function trueSourceLabel(metadata: ContactMetadata | null | undefined): string | null {
  if (!metadata) return null;
  if (metadata.utm_source) {
    return metadata.utm_campaign
      ? `${metadata.utm_source} / ${metadata.utm_campaign}`
      : metadata.utm_source;
  }
  if (metadata.landing_page?.startsWith("/blog/")) {
    return `Blog: ${metadata.landing_page.replace("/blog/", "")}`;
  }
  if (metadata.referrer) {
    try {
      const host = new URL(metadata.referrer).hostname.replace(/^www\./, "");
      return host;
    } catch {
      // Not a parseable absolute URL — ignore rather than show garbage.
    }
  }
  if (metadata.landing_page) return `Direct: ${metadata.landing_page}`;
  return null;
}

export type SourceQualityRow = {
  source: string;
  leadCount: number;
  winRate: number; // 0-100
  revenueCents: number;
};

export type SourceContact = {
  id: string;
  person_id: string;
  status: string;
  metadata: ContactMetadata | null;
  created_at: string;
};

export type SourcePerson = {
  id: string;
  attributes: { how_they_heard?: string } | null;
};

export type SourceOrder = {
  person_id: string;
  amount_cents: number;
  status: string;
};

/**
 * Per-source lead count, win rate, and revenue — combining the self-reported
 * `how_they_heard` with the captured true source (part 3), true source wins
 * when both are present since it's the harder-to-fake signal. Revenue is
 * attributed to a source via the person's FIRST contact (their original
 * source), summed across that person's paid orders.
 */
export function buildSourceQuality(
  contacts: SourceContact[],
  people: SourcePerson[],
  orders: SourceOrder[],
  window: { start: number; end: number } | null = null
): SourceQualityRow[] {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const inWindow = (iso: string) => {
    if (!window) return true;
    const t = Date.parse(iso);
    return t >= window.start && t < window.end;
  };
  // A lead counts as "won" if its pipeline status is won OR it produced actual
  // revenue (a paid order) — most people mean "closed" by win rate, so a paid
  // lead is a win regardless of whether someone flipped its status.
  const paidPersonIds = new Set(
    orders.filter((o) => o.status === "paid").map((o) => o.person_id)
  );
  const isWon = (c: SourceContact) =>
    c.status === "won" || paidPersonIds.has(c.person_id);

  // First contact per person -> that person's attributed source.
  const firstContactByPerson = new Map<string, SourceContact>();
  for (const c of contacts) {
    const existing = firstContactByPerson.get(c.person_id);
    if (!existing || Date.parse(c.created_at) < Date.parse(existing.created_at)) {
      firstContactByPerson.set(c.person_id, c);
    }
  }

  function labelFor(c: SourceContact): string {
    const trueSource = trueSourceLabel(c.metadata);
    if (trueSource) return trueSource;
    const selfReported = peopleById.get(c.person_id)?.attributes?.how_they_heard?.trim();
    return selfReported || "Unknown";
  }

  const bySource = new Map<string, { leadCount: number; won: number; revenueCents: number }>();

  // Lead count + win rate: leads CREATED in the window (a lead per inquiry).
  for (const c of contacts) {
    if (!inWindow(c.created_at)) continue;
    const label = labelFor(c);
    const entry = bySource.get(label) ?? { leadCount: 0, won: 0, revenueCents: 0 };
    entry.leadCount++;
    if (isWon(c)) entry.won++;
    bySource.set(label, entry);
  }

  // Revenue (computed but not currently displayed): kept on the same cohort as
  // leads — orders from people whose lead was CREATED in the window — so the
  // returned rows stay coherent and no out-of-window source shows a phantom
  // empty bar.
  const personSourceLabel = new Map<string, string>();
  for (const [personId, contact] of firstContactByPerson) {
    if (!inWindow(contact.created_at)) continue;
    personSourceLabel.set(personId, labelFor(contact));
  }
  for (const o of orders) {
    if (o.status !== "paid") continue;
    const label = personSourceLabel.get(o.person_id);
    if (!label) continue;
    const entry = bySource.get(label) ?? { leadCount: 0, won: 0, revenueCents: 0 };
    entry.revenueCents += o.amount_cents;
    bySource.set(label, entry);
  }

  return [...bySource.entries()]
    .map(([source, v]) => ({
      source,
      leadCount: v.leadCount,
      winRate: v.leadCount > 0 ? Math.round((v.won / v.leadCount) * 100) : 0,
      revenueCents: v.revenueCents,
    }))
    .sort((a, b) => b.leadCount - a.leadCount);
}

// ── Digest-specific: stale leads grouped by urgency ───────────────────────────
export type StaleLeadForDigest = {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  statusLabel: string;
  idleDays: number;
  thresholdDays: number;
  /** How far past its threshold, as a ratio — used only to rank/group. */
  urgency: "critical" | "warning";
};

/**
 * Build the digest's stale-lead list from the same `computeStaleness` the
 * dashboard uses, joined with lead/person info for display + deep links.
 * "Critical" = at least double its threshold overdue; "warning" = anything
 * else past threshold. Sorted most-overdue first within each group.
 */
export function buildDigestStaleLeads(
  leads: LeadRow[],
  activity: ActivityLogRow[],
  statusLabels: Record<string, string>,
  now: number
): { critical: StaleLeadForDigest[]; warning: StaleLeadForDigest[] } {
  const staleness = computeStaleness(leads, activity, now);
  const byId = new Map(staleness.map((s) => [s.id, s]));

  const critical: StaleLeadForDigest[] = [];
  const warning: StaleLeadForDigest[] = [];

  for (const lead of leads) {
    const s = byId.get(lead.id);
    if (!s || !s.isStale) continue;
    const overdueBy = s.idleDays - s.thresholdDays;
    const row: StaleLeadForDigest = {
      id: lead.id,
      name: lead.people?.name || "—",
      email: lead.people?.email || "—",
      type: lead.type,
      status: lead.status,
      statusLabel: statusLabels[lead.status] ?? lead.status,
      idleDays: s.idleDays,
      thresholdDays: s.thresholdDays,
      urgency: overdueBy >= s.thresholdDays ? "critical" : "warning",
    };
    (row.urgency === "critical" ? critical : warning).push(row);
  }

  critical.sort((a, b) => b.idleDays - a.idleDays);
  warning.sort((a, b) => b.idleDays - a.idleDays);
  return { critical, warning };
}
