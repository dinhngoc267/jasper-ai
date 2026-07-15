/**
 * Shared types, labels, and formatting for the admin leads pipeline.
 *
 * Deliberately has NO server-only imports (no `@/lib/supabase/server`) so it
 * can be safely imported from both the server-fetching page
 * (`src/app/admin/page.tsx`) and the client board/drawer components
 * (`src/app/admin/leads-board.tsx`, `src/app/admin/lead-drawer.tsx`) without
 * pulling server-only code into the client bundle.
 */

/** Shape of the custom attributes stored on people.attributes (jsonb). */
export type PersonAttributes = {
  how_they_heard?: string;
  company_size?: string;
  estimated_budget?: string;
};

/** The person joined onto a contact row. */
export type PersonInfo = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  attributes: PersonAttributes | null;
  created_at: string;
};

/** A contact ("lead"/inquiry) row joined to its person. */
export type LeadRow = {
  id: string;
  person_id: string;
  type: string;
  subject: string | null;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  people: PersonInfo | null;
};

/** One row in the append-only `activity_log` audit trail (may not exist yet
 * in production — see `admin/page.tsx`'s `fetchActivityLog`). */
export type ActivityLogRow = {
  id: string;
  contact_id: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  note: string | null;
  created_at: string;
};

export const TYPE_LABELS: Record<string, string> = {
  ai_development_project: "AI Development Project",
  ai_consulting: "AI Consulting",
  ongoing_support: "Ongoing Support",
  general_inquiry: "General Inquiry",
};

export const STATUS_LABELS: Record<string, string> = {
  new_lead: "New lead",
  contacted: "Contacted",
  discovery_call: "Discovery call",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

/** Per-status accent color (CSS var reference), matching the design mock's
 * status dot/pill treatment — new_lead=blue, contacted=purple,
 * discovery_call=teal, proposal=amber, won=green, lost=gray. */
export const STATUS_COLORS: Record<string, string> = {
  new_lead: "var(--blue)",
  contacted: "var(--purple)",
  discovery_call: "var(--teal)",
  proposal: "var(--amber)",
  won: "var(--green)",
  lost: "var(--gray-1)",
};

/** Fixed left-to-right column order for the Kanban board. */
export const STATUS_ORDER = [
  "new_lead",
  "contacted",
  "discovery_call",
  "proposal",
  "won",
  "lost",
] as const;

export type Status = (typeof STATUS_ORDER)[number];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Up to two initials for an avatar, e.g. "Maya Chen" -> "MC". */
export function initials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Relative "X ago" timestamp — ported exactly from the approved static
 * prototype's `ago()` (docs/product/prototype.html).
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const minutes = Math.max(1, Math.round((now - ts) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/**
 * Epoch ms this contact was last touched: its latest `activity_log` entry,
 * or when it came in if it has none yet. Ported from the prototype's
 * `lastTouched()`.
 */
export function lastTouchedMs(
  contact: { created_at: string },
  activity: ActivityLogRow[]
): number {
  if (!activity.length) return new Date(contact.created_at).getTime();
  return Math.max(...activity.map((a) => new Date(a.created_at).getTime()));
}

/**
 * Open leads (status not won/lost) with no movement in 48h+ are flagged so
 * nothing falls through the cracks silently. Closed leads never flag. Ported
 * from the prototype's `isStale()`.
 */
export function isStale(
  contact: { status: string; created_at: string },
  activity: ActivityLogRow[],
  now: number = Date.now()
): boolean {
  if (contact.status === "won" || contact.status === "lost") return false;
  return now - lastTouchedMs(contact, activity) > 48 * 60 * 60 * 1000;
}

/**
 * The live contact form (`src/app/actions/contact.ts`) never collects a
 * `subject` — it only exists for seeded/demo data. Fall back to a truncated
 * message so the drawer always has something sensible to show.
 */
export function subjectOrFallback(lead: {
  subject: string | null;
  message: string | null;
}): string {
  if (lead.subject) return lead.subject;
  const msg = (lead.message ?? "").trim();
  if (!msg) return "(no subject)";
  return msg.length > 48 ? `${msg.slice(0, 48)}…` : msg;
}
