# QA-REPORT — Admin leads Kanban board

**Date:** 2026-07-14 · **Task slug:** admin-leads-kanban

Note: this task's instructions specified a self-contained verify/report
checklist rather than a separate QA-agent handoff, so verification below was
performed directly by the developer against that checklist (not a separate
`@qa` pass).

## Acceptance coverage

| Requirement | Result |
|---|---|
| `tsc --noEmit` passes | PASS — zero errors |
| `eslint` passes | PASS — zero warnings/errors |
| `next build` passes with zero DB access | PASS — `/admin` still renders as `ƒ Dynamic`; build never touches the DB |
| 6 fixed columns in correct order | PASS — New lead, Contacted, Discovery call, Proposal, Won, Lost, verified visually |
| Card shows name/email/company/type badge/message/attributes/date | PASS — verified visually with a real test lead |
| "Move to" dropdown uses shared `selectClass` (custom chevron, not native arrow) | PASS — verified visually |
| Dropdown move works end-to-end (calls server action, persists) | PASS — moved a real test lead `new_lead → contacted` via the dropdown; card re-rendered in the new column with correct count |
| Drag-and-drop move works end-to-end | PASS — native `left_click_drag` mouse simulation does not trigger real HTML5 DnD events (a known browser-automation limitation, not an app bug); verified instead by dispatching real `DragEvent`s (`dragstart`/`dragover`/`drop`) at the actual card/column DOM nodes, which exercised the exact same `onDragStart`/`onDragOver`/`onDrop` handlers a real drag would — card moved `contacted → discovery_call` correctly |
| Missing `activity_log` table never blocks a status move | PASS — confirmed via server log: `PGRST205 Could not find the table 'public.activity_log'` was logged and swallowed; the `contacts.status` update and UI move both still succeeded |
| Per-column empty state | PASS — "No leads in this stage" shown in all empty columns |
| Whole-board empty state | PASS — shown when the live DB has zero leads (real state during this test) |
| No auth added | PASS — route unchanged, unprotected |

## Live DB test (per task's explicit allowance, since `website/.env.local` has real credentials)
Inserted, moved, and deleted one throwaway test lead against the real Supabase project:
- Inserted: `people` row `email = kanban-board-verification-test@jasper-ai.internal` (id `d7f0dcea-4032-42f2-8fb3-44732622ccab`) + linked `contacts` row (id `f01f926c-5f24-45f7-818d-f47c7731eb46`, type `ai_consulting`, status `new_lead`).
- Moved via UI: `new_lead → contacted` (dropdown), then `contacted → discovery_call` (simulated drag).
- Deleted: the `contacts` row (1 row) then the `people` row (1 row) — confirmed via delete `count`. Re-checked `/admin` afterward: back to the whole-board empty state, confirming no test data remains.

## Known follow-ups (operator action, not a defect)
- Run `website/supabase/migrations/0002_build2_activity_log.sql` in the Supabase SQL Editor. Until then, status moves work but no audit trail is recorded (by design — see graceful-degradation note above).
- After running the migration, do one more real move and confirm an `activity_log` row appears with the correct `from_status`/`to_status`.

---

## QA-REPORT — Revision: compact cards + drawer (2026-07-14)

Self-verified against the task's explicit checklist (build/typecheck/lint,
then live visual confirmation against the now-seeded real database via the
preview tool) rather than a separate `@qa` handoff, matching this task's
instructions.

| Requirement | Result |
|---|---|
| `tsc --noEmit` passes | PASS — zero errors |
| `eslint` passes | PASS — zero errors/warnings (also caught and fixed two `react-hooks/set-state-in-effect` violations in the first draft of `leads-board.tsx`/`lead-drawer.tsx`, resolved via React's "adjust state during render" pattern) |
| `next build` passes with genuinely zero DB access | PASS — temporarily moved `.env.local` out of the way, `rm -rf .next`, rebuilt clean; `/admin` still renders as `ƒ Dynamic`; `.env.local` restored afterward |
| Board shows all 6 columns, correct order, compact cards | PASS — verified visually: name, company/email, one type badge, relative timestamp only — no message/attributes/dropdown |
| Stale flag correct | PASS — Sam Okafor (5h old, `new_lead`) shows no flag; every other open lead (all seeded 2–11 days old with no activity rows) shows the amber-equivalent left accent + "⏳ Needs follow-up"; the two closed leads (won/lost) never flag regardless of age |
| Drawer opens with full detail | PASS — header (avatar/name/company/email), Stage chips (current highlighted), note textarea, Inquiry (type/subject/source/received/message), Attributes, Activity (empty state "No status changes yet" when no rows) |
| No native `window.prompt()` anywhere | PASS — confirmed by reading the component source; note capture is the inline textarea only |
| Repeat-contact "other inquiries" | PASS — opened Tom Helder's `contacted` inquiry, saw "Other inquiries from this person" listing the `won` one; clicked it, drawer switched in place and the reciprocal listing showed the `contacted` one — bidirectional switch confirmed |
| Stage chip + note move works end-to-end | PASS — moved Sam Okafor `new_lead → contacted` with a note via the drawer; card re-rendered in the new column immediately, no error shown |
| Missing `activity_log` never blocks a move or errors the UI | PASS — server log showed `PGRST205 Could not find the table 'public.activity_log'` logged and swallowed for both the read (`fetchActivityLog`) and the write (`updateLeadStatus`'s insert); the `contacts.status` update and UI move both still succeeded with no user-facing error |
| No drag-and-drop, no per-card dropdown | PASS — confirmed by reading the component source; cards are plain buttons that only open the drawer |
| No auth added | PASS — route unchanged, unprotected |

## Live DB verification
Ran `node website/scripts/seed-demo-leads.mjs` against the real Supabase
project (`website/.env.local` credentials): inserted 8 `people` + 9
`contacts`. Read-back in the script confirmed `people` total = 8, `contacts`
total = 9, and exactly 2 contacts for Tom Helder. Separately queried
`contacts` by `subject = "Quote automation agent"` before and after the
Sam Okafor move test above to confirm the round-trip: `contacted` → then
reverted to `new_lead` in the live database (not just the UI), matching the
seeded narrative. This seeded data is intentionally left in the database —
it is not test data to clean up.
