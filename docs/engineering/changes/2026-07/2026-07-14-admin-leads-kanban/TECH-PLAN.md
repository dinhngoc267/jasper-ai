# TECH-PLAN — Admin leads Kanban board

**Date:** 2026-07-14 · **Task slug:** admin-leads-kanban

## Goal
Turn the read-only `/admin` leads table into a Kanban pipeline board so the
operator can work a lead from `new_lead` through `won`/`lost` without ever
opening Supabase — the Build 2 requirement from the product plan ("I can move
a Contacts row through new_lead to contacted to discovery_call to proposal to
won or lost from the interface" + "each status change writes one activity_log
row").

## Architecture
- **DB:** one new table, `activity_log`, append-only audit trail of contacts
  status changes. Same RLS pattern as `people`/`contacts` (0001): enabled, no
  policies — anon key has zero access, server uses the service-role key.
- **Read path:** `/admin/page.tsx` stays a Server Component, `force-dynamic`,
  same joined query as before (now also selects `id`, already selected).
  Fetched rows are passed as props into a new Client Component,
  `admin/leads-board.tsx`, which owns all board interaction state.
- **Write path:** new `updateLeadStatus(contactId, newStatus)` Server Action
  in `src/app/actions/leads.ts`. Two-step: (1) read the contact's current
  `status` + `person_id` so we know `from_status`, (2) update `contacts.status`,
  (3) best-effort insert into `activity_log` in its own try/catch — a missing
  table (migration not yet run) must never fail the status update itself.
- **Shared styling:** `selectClass` (the appearance-none + custom chevron
  treatment already built for `contact-form.tsx`) is extracted to
  `src/lib/ui.ts` and imported by both `contact-form.tsx` and
  `leads-board.tsx` instead of being duplicated.

## Schema
See `website/supabase/migrations/0002_build2_activity_log.sql`.
- `activity_log.contact_id` / `.person_id` — FK, `on delete cascade`, `not null`.
- `from_status` nullable (first-ever log row for a contact could in principle
  have no prior status, though in practice `new_lead` is always the start).
- `to_status`, `actor` — `not null`; `actor` defaults `'admin'` (no auth yet,
  per the product plan — every action in this unprotected build is the
  operator).
- Indexes: `(contact_id)`, `(created_at desc)` — mirrors the `contacts` index
  style from 0001.
- RLS enabled, no policies — identical security model to 0001.

## Key decisions
- **Graceful degradation is load-bearing, not an edge case.** The operator
  will use the board before running the 0002 migration. `updateLeadStatus`
  must let the status move succeed even when `activity_log` doesn't exist yet
  — the try/catch around the log insert plus a server-side `console.error` is
  the whole mechanism; no feature flag, no pre-check `SELECT` against
  `information_schema`.
- **Client-side board, server-fetched data.** The whole board's data still
  comes from one server-side query at request time (`force-dynamic`, as
  before) — the client component only owns *interaction* state (which card is
  mid-move, optimistic column placement), not data fetching. No new client-side
  Supabase client, no new REST endpoint.
- **Native HTML5 drag-and-drop + a required `<select>` fallback.** No new npm
  dependency for drag-and-drop (`draggable` + `onDragStart`/`onDragOver`/
  `onDrop`) — the operator is non-technical and mobile is a first-class path,
  so the dropdown is not a "nice to have," it's the primary interaction for
  touch devices.
- **Optimistic move + revert-on-failure**, no full `router.refresh()` round
  trip on the happy path — feels instant on a 3-5-inquiries-a-week volume
  board; state is small (all leads already in memory) so optimistic update is
  simple and safe. On failure: move the card back to its original column and
  show a small inline error on that card.
- **No auth.** Product plan is explicit: don't add login until asked.

## Constraints honored
Migration is written but NOT executed (operator pastes into Supabase SQL
Editor). No commit/push/deploy. `next build` requires zero DB access
(unchanged `force-dynamic` pattern). No new npm dependencies.

---

## Revision — compact cards + drawer (operator-approved static prototype)

**Why:** the drag/dropdown Kanban above was reviewed live and found cluttered
— too much on every card, forced horizontal scroll, and a jarring native
`window.prompt()` for stage-change notes. A static HTML prototype
(`docs/product/prototype.html`, `#admin` section) was built, tested live, and
approved. This revision rebuilds the real page to match it exactly.

### Behavior change
- Cards shrink to: name, company (or email), one type badge, relative "X ago"
  timestamp. No message preview, no attributes, no per-card dropdown.
- No drag-and-drop. Moving a lead only happens from the drawer's 6 stage
  chips + an inline "Optional note" textarea — never a native `prompt()`.
- Clicking a card opens a right-side sliding drawer: header (avatar/name/
  company/email), Stage (chips + note), Inquiry (type/subject/source/
  received/full message), Attributes, Activity timeline (empty state "No
  status changes yet"), and — only when the person has >1 contact — "Other
  inquiries from this person", each row switching the drawer in place.
- Stale flag: any OPEN lead (status not won/lost) with no activity in 48h+
  gets a subtle left-border + "⏳ Needs follow-up" label. Ported verbatim
  from the prototype's `lastTouched()`/`isStale()`.

### Data shape
`LeadRow` (in `src/lib/leads.ts`) now also carries `person_id`, `subject`,
`source`, and `people.id` / `people.created_at` (needed to group "other
inquiries" by person and to fall back to `created_at` when a contact has no
activity rows yet). A new `ActivityLogRow` type and a `fetchActivityLog()`
query are added to `admin/page.tsx`, wrapped in the same try/catch pattern as
`fetchLeads()` — if `activity_log` doesn't exist yet (0002 not run), it
returns `[]` and the board still renders (every lead just shows "No status
changes yet" and staleness falls back to `contacts.created_at`).

`updateLeadStatus(contactId, newStatus, note?)` gains an optional third
argument, stored on the `activity_log` insert (still wrapped in its own
try/catch — a missing table must never fail the move).

### Color constraint
The prototype's palette (amber flags, purple/support/general badge hues,
green "won" / red "lost" chips) does not exist as tokens in
`globals.css` — only `--ink`, `--ink-soft`, `--gray-1/2/3`, `--rule`,
`--blue`, `--blue-soft`, `--cream`, `--paper` are defined. Rather than invent
new hex values, this revision maps everything onto that limited palette and
lets text/icons carry meaning instead of hue:
- All four inquiry-type badges use one `--blue-soft`/`--blue` treatment; the
  label text (not the color) distinguishes them.
- The stale flag uses a `--gray-2` left-border + the "⏳" glyph for urgency,
  instead of amber.
- The current-stage chip is always `--ink` background regardless of which
  stage (no green/red variants) — the label text already says "Won"/"Lost".

### Files
- `src/lib/leads.ts` — extended types (`LeadRow`, `ActivityLogRow`,
  `PersonInfo`), new helpers `timeAgo`, `isStale`, `lastTouchedMs`,
  `initials`, `subjectOrFallback`, exported `Status` type.
- `src/app/admin/page.tsx` — adds `fetchActivityLog()`, passes both arrays to
  `LeadsBoard`.
- `src/app/admin/leads-board.tsx` — rewritten: board/column/card only
  (no drag, no dropdown); owns drawer-open state, grouping by person and by
  contact, and the move-with-note flow (optimistic update + revert on
  failure).
- `src/app/admin/lead-drawer.tsx` — new: the drawer UI described above.
- `src/app/actions/leads.ts` — `note?: string` param.
- `website/scripts/seed-demo-leads.mjs` — new: one-time seed of 8 people / 9
  contacts (Tom Helder has 2, the repeat-contact demo) directly into the
  live DB via the service-role key. Run once by hand; not part of the Next.js
  build. Does not seed `activity_log` (0002 not run yet) or `orders` (Build 2,
  out of scope).

### Constraints honored (this revision)
No commit/push/deploy. No new npm dependency (uses `@supabase/supabase-js`,
already a dependency, and Node's built-in `fs` to read `.env.local`). Seed
script is run for real against the live database per explicit operator
instruction — the resulting rows are left in place, not cleaned up.
