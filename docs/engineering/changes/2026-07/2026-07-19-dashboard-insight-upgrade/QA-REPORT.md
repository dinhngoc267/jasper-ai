# QA REPORT: Dashboard insight upgrade + homepage blog section

Date: 2026-07-19  |  Result: PASS

## Acceptance Criteria Coverage (per TECH-PLAN "Verification plan")

| # | Item | Method | Result |
|---|------|--------|--------|
| 1 | Leads-vs-Won numbers match direct Supabase queries, 10-week window | Reimplemented `buildLeadsVsWon` line-for-line in a standalone Node script against live `contacts`/`activity_log` via service-role key; cross-checked against rendered SVG axis ticks/labels on the live page | **PASS** |
| 2 | Content-attribution numbers match direct queries on `metadata->>'landing_page'` | Same method, reimplemented `buildContentAttribution`; live data currently has 0 contacts with a `/blog/`-prefixed landing page, so the table correctly renders its empty state | **PASS** (see note) |
| 3 | Source-performance leads/win-rate/revenue match pre-change Source-quality values | Reimplemented unchanged `buildSourceQuality`; cross-checked computed values against rendered page (revenue `$148,000`/`$140,000`/`$27,000`/`$71,000` and win rates `33%`/`30%`/`25%` all present and matching) | **PASS** |
| 4 | Needs-attention in-place actions still write exactly one `activity_log` row each, after reorder | Code inspection: `needs-attention-table.tsx` and `actions/leads.ts` are byte-identical to the pre-existing Build 3 versions (only the JSX call site moved earlier in `page.tsx`); each of `updateLeadStatus`/`addLeadNote`/`markLeadFollowedUp` performs exactly one `activity_log.insert()`. Build 3's QA-REPORT already Playwright-verified all three actions live against Supabase. No new live re-test performed (no browser automation tool in this environment) | **PASS** (via code-identity + prior E2E coverage) |
| 5 | Homepage renders correctly with 1 post; fake 2nd/3rd post renders 3-card layout | Fetched live homepage HTML with 1 real post (clean single-item list, no empty cells — layout is a divided stacked list, not a grid, so there's no "empty grid cell" failure mode to begin with). Temporarily added `qa-fake-post-2.md`/`qa-fake-post-3.md` under `src/content/blog/`, refetched: exactly 3 items rendered, correctly sorted newest-first (Jul 18, Jul 17, Jul 16). Deleted both fixture files afterward — `src/content/blog/` is back to the single real post | **PASS** |
| 6 | Auth regression: `/admin` still requires login; homepage is public | `curl` with no cookie: `/admin` → `307` to `/admin/login`; `/` → `200`. No new logged-out admin surface introduced | **PASS** |
| 7 | No new hex colors in the diff outside `globals.css` tokens | `grep -n '#[0-9a-fA-F]\{3,8\}'` across the full diff of all 5 touched files (`dashboard.ts`, `dashboard-widgets.tsx`, `page.tsx` (admin), `needs-attention-table.tsx`, `page.tsx` (homepage)) — zero matches | **PASS** |

## Section order / structure (independently confirmed)
Fetched `/admin` live (throwaway Supabase auth user, deleted after) — section labels appear in the exact order specified: **Act now → Pipeline health → Channel performance → Revenue history**. `LeadsVsWonChart`'s rendered SVG has y-axis ticks `0/4/8` (max = 8, matching independently computed data) and x-axis week labels (`May 11, May 25, Jun 8, Jun 15, Jun 29, Jul 13`), which match the exact subsampled index set the component's `labelIdx` logic selects out of the 10 independently-computed week-start dates.

## Automated checks (developer-run, spot-checked)
`npx tsc --noEmit`, `npm run build`, `npm run lint` were not independently rerun by QA (developer already ran these and confirmed no new errors vs. `main` baseline); the live `npm run dev` server used for the checks above compiled and served all touched routes without runtime errors.

## Manual Verification Required (flag to human)
- [ ] Visual/pixel review of the new chart and bar layouts (QA can confirm data correctness and DOM structure, not subjective visual polish).
- [ ] Content-attribution is currently untestable against **real** blog-driven leads, since no contact in the live DB has a `/blog/`-prefixed `landing_page` yet (0 of 37 contacts). The empty-state path is verified; the populated-row rendering path (table with real slug/lead/win-rate/revenue columns) is only verified by code inspection matching `SourceQualityTable`'s structure — recommend a follow-up spot-check once real blog-driven leads exist.

## Edge Cases Tested
- Leads-vs-Won: currently-won contacts with no `activity_log` "to_status=won" row correctly fall back to `created_at` (confirmed via code path reading `wonAt` initialization).
- Homepage: 1 post (today's real state) and 3 posts (faked) both render without broken/empty grid cells — moot for empty-cell risk specifically, since the layout is a `flex-col divide-y` list, not a CSS grid.
- Auth: logged-out `/admin` request correctly redirects; no bypass introduced by the page.tsx restructure.

## Known Issues / Follow-ups
- None blocking. One non-blocking recommendation: once a real blog-driven lead exists, re-verify `ContentAttributionTable`'s populated-row rendering (only the empty state was exercisable against live data today).

## Cleanup performed
- Deleted throwaway Supabase auth user (`qa-throwaway-dashboard@example.com`) created for authenticated fetch.
- Deleted temporary fixture files `qa-fake-post-2.md` / `qa-fake-post-3.md` from `website/src/content/blog/`.
- Removed temporary verification scripts copied into `website/` for module resolution; stopped the `npm run dev` server started for this QA pass.
- No commits made; no files pushed. All source changes remain exactly as the developer left them (unstaged).

---

## Addendum (2026-07-19, later same day): Needs Attention reversed to bottom + upgraded to full table

Result: **PASS**

Operator reversed the "Act now" decision above — Needs Attention moves back to
the **bottom** of `/admin` (after Revenue history), because it's now a full
data table (search + sort + pagination), which structurally fits better as
the page's last, largest section than competing for top billing.

| # | Item | Method | Result |
|---|------|--------|--------|
| 1 | Optimistic in-place actions (status change / note / mark followed up) still work — row disappears immediately, rollback + error message on failure | Code inspection of current `needs-attention-table.tsx`: `handleMoveStage`/`logNote` create an optimistic `ActivityLogRow`, call `appendActivity` + `markHandled` (adds id to `handledIds`, which filters the row out of `rows`), then on server-action failure call `removeActivity` + un-mark `handledIds` + `setError`. This is the same pattern `leads-board.tsx` uses with the same server actions (`updateLeadStatus`/`addLeadNote`/`markLeadFollowedUp`). Confirmed via `SendMessage` with the developer agent that the LeadDrawer/optimistic wiring itself (and the `addLeadNote`/`markLeadFollowedUp` additions to `actions/leads.ts`, and the drawer button additions in `lead-drawer.tsx`) predate today's round — today's round only added search/sort/pagination plus one line, `setPage(1)`, inside `markHandled()`, confirmed correct (a row leaving the list can no longer strand the operator on a now-empty page). Not re-exercised live end-to-end this pass (no browser automation tool available this session) | **PASS** (code inspection; live DOM/data confirmed for items 2-4 below) |
| 2 | Search filters by name/email/type, case-insensitive, resets to page 1 | Code inspection: `filteredRows` lowercases query and row fields, substring-matches `name`/`email`/type label; `handleSearchChange` calls `setPage(1)` on every keystroke | **PASS** (code inspection) |
| 3 | Column sort (Person/Type/Stage/Idle) toggles asc/desc with chevron; default = idle-days descending (oldest first) | Code inspection + live render: default `sortKey="idle"`, `sortDirection="desc"`; live-fetched `/admin` HTML shows the stale list topped by 59d/34d/33d (descending), matching prior "oldest first" behavior. `SortableHeader` shows `ChevronUp`/`ChevronDown` only on the active column | **PASS** |
| 4 | Pagination: 10/page, "Showing X–Y of Z", Prev/Next disable at boundaries | Live-fetched `/admin` via a throwaway Supabase auth user (created, used, deleted within this pass — see Cleanup): rendered HTML shows `Showing 1–10 of 24`, `Page 1 of 3`, Prev `disabled=""` on page 1, Next enabled | **PASS** (live) |
| 5 | Needs Attention renders as the LAST section, after Revenue history, with its own `SectionLabel` matching other sections | Live-fetched `/admin`: `<h2>` section labels appear in order **Pipeline health → Channel performance → Revenue history → Needs attention**, all sharing the identical `SectionLabel` class string | **PASS** (live) |
| 6 | Auth regression: `/admin` still requires login | `curl -s -o /dev/null -w "%{http_code} %{redirect_url}"` against the already-running local dev server: `307` → `/admin/login` | **PASS** |
| 7 | No new hex colors in `page.tsx` / `needs-attention-table.tsx` diff | `git diff` of both files piped through `grep -E '#[0-9a-fA-F]{3,8}'` — zero matches. New button in `lead-drawer.tsx` (pre-existing from an earlier round, not this one) uses `--green`/`--green-soft`, both already defined in `globals.css` | **PASS** |

### Scope note on out-of-scope files
`website/src/app/actions/leads.ts` and `website/src/app/admin/(dashboard)/lead-drawer.tsx` do show up in `git diff` against `main` (73 and 50 lines respectively), which at first read looks like a violation of this round's "do not touch" constraint. Nothing in this repo has been committed since Build 3, so `git diff main` always accumulates every prior uncommitted round, not just the round under review. Cross-checked with the developer agent directly: those two files' changes (the `addLeadNote`/`markLeadFollowedUp` server actions and the drawer's "Save note"/"Mark followed up" buttons) were introduced in an earlier round that first wired the LeadDrawer into the needs-attention list, not in today's search/sort/pagination round. Corroborating evidence: `leads-board.tsx` (also unrelated to today's task) independently calls the same new `onAddNote`/`onMarkFollowedUp` drawer props, which only makes sense if that plumbing already existed before today. Today's actual diff footprint is exactly `page.tsx` (section reorder + label) and `needs-attention-table.tsx` (search/sort/pagination + `setPage(1)`) — verified untouched: `website/src/lib/dashboard.ts` is unchanged by today's round (its diff predates today, adding `thresholdDays`/`needsAttentionLeads`/`needsAttentionActivity`, again from the earlier LeadDrawer-wiring round).

### Automated checks (spot rerun)
`npx tsc --noEmit` rerun clean (no errors). `npm run lint` rerun: same 8 pre-existing errors as the developer's baseline (all in files untouched by this round — `contact-form.tsx`, `blog/[slug]/page.tsx`, `blog/layout.tsx`, `page.tsx` homepage — none in `needs-attention-table.tsx` or the admin `page.tsx`).

### Cleanup performed (this addendum)
- Created + deleted throwaway Supabase auth user `qa-throwaway-needs-attention@example.com` (via `auth.admin.createUser`/`deleteUser`, service-role key from `website/.env.local`); no changes to the real operator account.
- Temporary Node script used to mint the session cookie and fetch `/admin` was written to the scratchpad directory and removed from `website/` after use (never committed, never left in the repo).
- Did not stop the `next dev` server on port 3000 — it was already running for another agent in this session before QA started; left running as found.
- No commits made; no files pushed.
