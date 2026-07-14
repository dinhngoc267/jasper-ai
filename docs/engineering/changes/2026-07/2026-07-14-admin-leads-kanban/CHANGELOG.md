# CHANGELOG — Admin leads Kanban board

**Date:** 2026-07-14 · **Task slug:** admin-leads-kanban

## Files created
- `website/supabase/migrations/0002_build2_activity_log.sql` — new `activity_log` table (status-change audit trail). NOT yet run against Supabase — operator pastes into the SQL Editor.
- `website/src/app/actions/leads.ts` — `updateLeadStatus(contactId, newStatus)` server action: validates status, reads old status, updates `contacts.status`, best-effort logs to `activity_log` (never blocks the move if that insert fails).
- `website/src/app/admin/leads-board.tsx` — client Kanban board: 6 fixed columns, drag-and-drop (native HTML5, no new dependency) + a "Move to" `<select>` fallback on every card, optimistic move with revert-and-inline-error on failure.
- `website/src/lib/leads.ts` — shared types (`LeadRow`, `PersonAttributes`), `TYPE_LABELS`, `STATUS_LABELS`, `STATUS_ORDER`, `formatDate` — used by both the server page and the client board, with no server-only imports so it's safe in the client bundle.
- `website/src/lib/ui.ts` — extracted `fieldClass` / `selectClass` (the appearance-none + custom chevron treatment) out of `contact-form.tsx` so the board reuses the exact same look instead of duplicating the string.

## Files modified
- `website/src/app/admin/page.tsx` — still a `force-dynamic` Server Component with the same joined `contacts`/`people` query; now renders `<LeadsBoard>` instead of a table. Empty-state copy unchanged in meaning (DB unreachable vs. zero leads).
- `website/src/app/contact-form.tsx` — imports `fieldClass`/`selectClass` from `@/lib/ui` instead of defining them locally. No visual or behavioral change.

## DB changes
- New table `activity_log` (see migration file above). RLS enabled, no policies — same security model as `people`/`contacts`. Not yet applied to the live database.

## Env vars
None added. `.env.example` (repo root) already declares everything this task needs (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Breaking changes
None. `/admin` route and its data shape are unchanged from the outside; only the rendering (table → board) changed. No auth was added, per the product plan's explicit instruction not to add one yet.

---

## Revision — compact cards + drawer (operator-approved static prototype)

The drag/dropdown board above was reviewed live and found cluttered; a static
HTML prototype (`docs/product/prototype.html`) was built, tested, and
approved. This revision rebuilds the real page to match it.

### Files created
- `website/src/app/admin/lead-drawer.tsx` — the right-side sliding drawer:
  header (avatar/name/company/email), Stage (6 clickable chips + an inline
  "Optional note" textarea — no native `window.prompt()`), Inquiry, Attributes,
  Activity timeline (empty state "No status changes yet"), and — only when the
  person has more than one contact — "Other inquiries from this person", each
  row switching the drawer to that contact.
- `website/scripts/seed-demo-leads.mjs` — one-time script that seeds 8 people
  / 9 contacts (one person, Tom Helder, with 2 separate inquiries) directly
  into the live Supabase database via the service-role key. Idempotent
  (upserts people by email, skips a contact insert if one with the same
  person_id + subject already exists).

### Files modified
- `website/src/lib/leads.ts` — extended `LeadRow` (`person_id`, `subject`,
  `source`, `people.id`/`people.created_at`), new `ActivityLogRow` type,
  exported `Status`, and new helpers `timeAgo`, `isStale`, `lastTouchedMs`,
  `initials`, `subjectOrFallback` — the staleness/relative-time logic is
  ported verbatim from the approved prototype's `lastTouched()`/`isStale()`/
  `ago()`.
- `website/src/app/admin/page.tsx` — extends the `contacts` select to the new
  fields; adds `fetchActivityLog()` (same graceful-null/empty-on-error
  pattern as `fetchLeads()` — returns `[]`, not throw, if `activity_log`
  doesn't exist yet); passes both arrays into `LeadsBoard`.
- `website/src/app/admin/leads-board.tsx` — rewritten. Cards are now minimal
  (name, company/email, one type badge, relative timestamp, stale flag) with
  no message/attributes/dropdown. No drag-and-drop. Owns drawer-open state,
  groups contacts by person (for "other inquiries") and by contact id (for
  each lead's activity), and the move-with-note flow (optimistic update,
  revert + inline error on failure).
- `website/src/app/actions/leads.ts` — `updateLeadStatus` gains an optional
  third argument, `note?: string`, stored on the `activity_log` insert (still
  wrapped in its own try/catch — a missing table never fails the move).

### DB changes
None beyond the already-written (not yet run) `0002_build2_activity_log.sql`.
This revision only adds real rows to the existing `people`/`contacts` tables
via the seed script — see "Live data seeded" below.

### Env vars
None added.

### Breaking changes
None. Same route, same underlying tables. The Kanban interaction model
(drag-and-drop + per-card dropdown) is deliberately removed and replaced by
the drawer's stage chips, per the operator's explicit approval of the static
prototype.

### Live data seeded (real, not test data)
Ran `node website/scripts/seed-demo-leads.mjs` against the live Supabase
project. Inserted 8 `people` rows and 9 `contacts` rows, spread across all 6
pipeline stages, with `created_at` staggered from 5 hours ago to 21 days ago.
Tom Helder (Helder Capital) has two separate inquiries — one `won`
("Deal-memo knowledge graph"), one `contacted` ("Retainer for the deal-memo
graph") — the repeat-contact drawer demo. Read-back after seeding confirmed
`people` total = 8, `contacts` total = 9, and exactly 2 contacts for Tom
Helder. This data is meant to stay in the live database.
