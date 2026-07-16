# QA-REPORT — Admin Dashboard & Analytics (E3) verification

**Date:** 2026-07-16 · **Task slug:** admin-dashboard-verification · **Commit under test:** `bdfff3d` (2026-07-15 15:35)

Verifying against the acceptance criteria in `docs/plans/2026-07-16.md` (priority #1) and the E3 drilldown in `docs/product/epic-status.md`. This is the hard entry gate for E4. No engineering-changes folder existed for `bdfff3d` prior to this report (confirmed — only `2026-07-14-admin-leads-kanban` and `2026-07-14-build1-people-contacts` existed under `docs/engineering/changes/2026-07/`), so this is a new folder.

## Method
Read the dashboard's source directly — `website/src/lib/dashboard.ts` (all metric builders), `website/src/lib/period.ts` (period toggle semantics), `website/src/app/admin/(dashboard)/page.tsx`, `website/src/app/admin/(dashboard)/needs-attention-table.tsx` — then pulled the full contents of `contacts`, `activity_log`, `orders`, and `people` directly from the live Supabase project via `mcp__supabase__execute_sql` (37/51/18/26 rows respectively, matching `list_tables` row counts exactly). Re-implemented every metric independently in a standalone Node script (`verify.js`, not the app's code) against that raw data, using the DB's own `now()` (2026-07-16 06:38:15 UTC) as the reference clock, and cross-checked both the app's documented "trailing window" definition and a plain calendar-week/calendar-month reading. No browser/Playwright tool was available in this session, so the live rendered HTML behind the Supabase-Auth gate was not screenshotted — the KPI/chart *computation* was verified directly against the database instead, which is the correctness-critical layer (the widgets just print the pre-computed values as-is). Auth gating was verified against the real production URLs directly.

## Acceptance criteria coverage

| # | Item | Result | Query run | DB result | Code's computed value |
|---|---|---|---|---|---|
| 1 | New leads this week | PASS (with caveat) | `countInWindow` reimplemented; also plain calendar-week (Mon 00:00 UTC → now) | Trailing 7d: **11**. Calendar week: **5** | Default landing view is `period=month` (trailing 30d = **22**), not week — see finding below |
| 2 | Open pipeline | PASS | `count(*) where status not in ('won','lost')` | **25** (new_lead 9, contacted 8, discovery_call 4, proposal 4) | **25** — exact match, period-independent as designed |
| 3 | Revenue this month | PASS (with caveat) | Sum `amount_cents` where `status='paid'`, trailing 30d vs calendar-month-to-date | Trailing 30d: **$89,000**. Calendar month (Jul 1–16): **$56,000** | Code shows **$89,000** (trailing 30d, paid-only) by default — filter on `status='paid'` is correct business intent (excludes 1 pending + 1 refunded order), but see finding below |
| 4 | Newsletter subscribers | PASS | `count(*) where ok_to_contact = true` | **21** / 26 total people | **21** — exact match |
| 5 | Conversion funnel | PASS | Reimplemented "furthest stage reached" (current status ∪ all activity_log from/to) fully independently, traced all 4 `lost` contacts by hand | new_lead **36**, contacted **24**, discovery_call **16**, proposal **12**, won **8** | Exact match on all 5 stages. Confirmed cumulative counting is correct (no double-count) and correctly credits leads later marked `lost` for stages they passed through first — verified 3 of 4 lost contacts have a `{from: new_lead, to: lost}` activity_log row and are correctly credited to `new_lead` |
| 6 | Revenue-by-month (2-month spot check) | PASS | Manual sum of paid orders, May and June 2026 calendar months | May **$73,000**, June **$67,000** (refunded $9,000 order on 06-14 correctly excluded) | Exact match on both months |
| 7 | How-they-heard breakdown | PASS | `group by attributes->>'how_they_heard'`, all 26 people (not filtered to subscribers) | Referral 8, LinkedIn 7, Search 6, Event 3, GitHub 1, Website 1 | Exact match — confirmed code intentionally uses the full people set, not just `ok_to_contact` |
| 8 | Needs-attention list / staleness | **PASS** (re-verified 2026-07-16, see addendum) | Reimplemented staleness (`lastActivityMs` fallback to `created_at`, 7-day threshold) independently | **14** open contacts are genuinely idle ≥7 days | Fixed: `buildNeedsAttention` no longer slices — returns all 14, and `needs-attention-table.tsx` renders every row and prints the live count in the subtitle |
| 9 | Auth regression (`getClaims`) | PASS | `curl -I` against live production, no session cookie, all 5 gated routes | All 5 → `307` redirect to `/admin/login`, no body/data leak | Matches `website/src/lib/supabase/middleware.ts` logic exactly |

## Bugs found

1. **Needs-attention list hides stale leads with no indication (item 8, FAIL).** `website/src/lib/dashboard.ts`, `buildNeedsAttention()` — the function correctly finds all 14 currently-stale open leads but returns `rows.slice(0, 8)` with nothing upstream (`needs-attention-table.tsx`) showing that 6 more exist. On this 26-person test dataset that's already 43% of stale leads invisible on the dashboard. This directly undermines E4's stated dependency ("E4's third weekly decision and the 7-day rule depend on that list being correct") — the operator could believe the list is clear when it isn't. Minimum fix: show a "+6 more" link/count, or a "View all N" link into a filtered `/admin/leads` view; removing the cap entirely is also acceptable at this data volume.

2. **"This week" / "this month" KPI labels don't mean calendar week/month (items 1 & 3, non-blocking but should be clarified with the operator).** The dashboard's period toggle defaults to `month` = a trailing 30-day window, not the calendar month. "Revenue" shows $89,000 (trailing 30d) vs. $56,000 for July-to-date — a $33,000 difference that could mislead a real business decision. Similarly "week" = trailing 7 days, not Mon–Sun. This is an intentional, internally-consistent design (documented in `period.ts`), not a broken calculation, but the daily plan's own acceptance-criteria wording ("new leads this week," "revenue this month") assumes calendar periods. Recommend a one-line product decision: keep trailing windows (and relabel to "last 7/30/91 days" to avoid ambiguity) or add true calendar-period options.

3. **Minor data-integrity note, not a dashboard defect:** contact `f1f5b992` (status `lost`) has zero `activity_log` rows, so it contributes to no funnel stage at all (not even `new_lead`), unlike the other 3 lost contacts which have a logged `new_lead → lost` transition. `activity_log` is documented as an append-only audit trail that should cover every status change — this one gap looks like either seed data or a transition that didn't get logged. Doesn't affect the funnel algorithm's correctness, just worth a look.

## Overall verdict (original pass): **E3 does NOT pass verification — 8 of 9 items PASS, 1 FAILS.**

The KPI math, funnel algorithm, revenue-by-month, and how-they-heard breakdown are all correct and precisely match the database — strong result on the highest-risk logic (the funnel). The blocking issue is narrow and cheap to fix: the needs-attention list's silent 8-row cap (bug #1) directly threatens the specific E4 dependency that was called out by name in `epic-status.md`. Recommend: fix #1 (add a count/"+N more" affordance), get an operator decision on #2 (trailing-window vs. calendar-period labeling), then re-run this verification. Do not start the E4 weekly loop until #1 is resolved and re-verified — a hidden stale-lead count would corrupt the very weekly decision E4 exists to drive.

## Manual verification required (flagged, not performed by this pass)
- Visual/pixel confirmation of the live rendered `/admin` page (no browser/Playwright tool available this session — computation was verified directly against the DB instead, which is lower-risk than the render layer).

---

## Addendum — re-verification of item 8 (2026-07-16, same day)

**Fix under test:** developer's uncommitted working-tree change to `website/src/lib/dashboard.ts` (`buildNeedsAttention` — removed `return rows.slice(0, 8)`, now `return rows;` uncapped) and `website/src/app/admin/(dashboard)/needs-attention-table.tsx` (subtitle now computed from `rows.length`, e.g. "14 open leads with no movement in 7+ days — oldest first", instead of a static string). **Not yet committed** at time of this re-verification.

**Scope check:** `git diff` on both files confirms the change touches *only* the `.slice(0, 8)` → uncapped return in `buildNeedsAttention` and the `Card` subtitle string in `needs-attention-table.tsx`. No other logic in either file, and no other acceptance item's code path, was touched.

**Independent re-check:** re-ran a standalone Node script against the live Supabase project (same `contacts` + `activity_log` tables, same staleness algorithm — `lastActivityMs` per contact falling back to `created_at`, 7-day threshold, `Date.now()` reference clock matching the app's own), written fresh and not importing `dashboard.ts`.
- True count of open (not won/lost) contacts idle ≥7 days: **14** (identical to the original pass — same 14 contact IDs, same idle-day values, sorted descending 55d → 7d).
- Traced `buildNeedsAttention` in the current `dashboard.ts`: no `.slice`, `.length`, or any other truncation between the sort and the `return rows;` — all 14 rows are returned, in the same idleDays-descending order.
- Traced `needs-attention-table.tsx`: `rows.map(...)` renders every row with no slice/cap in the component either; subtitle interpolates `rows.length` directly (`14 open leads with no movement in 7+ days — oldest first`), matching the true count exactly.

**Result: item 8 now PASSES.** Zero omissions — the code returns and displays all 14 stale leads, with a total count visible to the operator.

## Overall verdict (updated): **E3 now passes all 9 of 9 acceptance-criteria items**, pending: (a) commit of the fix (currently uncommitted in the working tree), and (b) the separate, non-blocking operator decision on trailing-window KPI labeling (bug #2) — that item was already scored PASS-with-caveat before and after this addendum, and is unchanged by this fix. The E4 gate's specific blocking dependency (a complete, non-truncated needs-attention list) is resolved.
