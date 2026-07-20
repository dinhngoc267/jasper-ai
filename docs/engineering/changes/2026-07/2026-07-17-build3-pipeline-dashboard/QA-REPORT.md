# QA REPORT: BUILD 3 — The dashboard works the pipeline for me

Date: 2026-07-17  |  Result: **PASS**

> Note: No `TECH-PLAN.md` / `EXEC-PLAN.md` were found in this folder when QA started —
> this report was written retroactively against the BUILD 3 spec in
> `docs/product/product-plan.md` (lines ~159–258). Developer should backfill those two
> files and a `CHANGELOG.md` alongside this report to keep the engineering-docs
> convention intact.

## Method
Reviewed all touched source files, then verified against the running app (`npm run dev`
against the real dev/prod-shared Supabase project) using a throwaway admin user
(`qa-throwaway-build3@example.com`, created via `auth.admin.createUser` and deleted at
the end — the real operator account `jasper.le@edge8.ai` was never touched) and
Playwright for browser-driven testing. Independently recomputed the funnel math in a
sandboxed script against live `contacts`/`activity_log` data pulled directly from
Supabase (not through the app) to cross-check the dashboard's displayed numbers.
All test data (contacts, people, activity_log rows) created during verification was
deleted afterward; `contacts`/`activity_log`/`people` row counts were confirmed
identical (37 / 51 / 26) before and after this QA pass.

## Definition of Done Coverage

| DoD item | Test type | Result |
|---|---|---|
| Funnel shows stage-to-stage conversion + median time-in-stage, matches direct Supabase queries | Independent recompute (sandboxed JS against live REST data) vs. dashboard screenshot | **PASS** — counts `[36,24,16,12,8]`, conversion `[—,67%,67%,75%,67%]`, median days `[4,4,4,4,—]` matched the dashboard exactly |
| Source-quality table shows lead count, win rate, revenue per source | Browser snapshot of `/admin` | **PASS** — 6 source rows rendered (Referral/Search/LinkedIn/Event/Website/GitHub) with plausible counts, win rates, and revenue; matches `buildSourceQuality`'s true-source-wins-over-self-reported logic on review |
| Needs-attention: change status, add note, mark followed up — in place, each writes activity_log | Browser-driven (Playwright) + direct Supabase verification | **PASS** — see "Interactive drawer" below, all three actions verified with real DB writes, no navigation away |
| Blog-post-started submission stores landing page + referrer + UTM in `contacts.metadata`, drawer displays it | Browser-driven end-to-end (blog post → CTA → contact form → submit) + Supabase row check | **PASS** — see "Source capture" below |
| Every blog post ends with shared CTA linking to contact form | Code review (`blog/[slug]/page.tsx` line 49) + live render | **PASS** |
| Weekday digest: KPI row w/ deltas, mini funnel w/ conversion, stale leads by urgency w/ working deep links, renders with remote images blocked, acted-on lead absent from next digest | `?preview=1` render + Supabase auth check + deep-link click-through | **PASS** — see "Digest email" below |
| Everything behind existing login; nothing new reachable logged out | curl w/o session cookie (307 to `/admin/login`) + cron route's independent `CRON_SECRET` check | **PASS** — see "Auth" below |

## Interactive drawer (highest-risk surface) — verified live
1. Opened "Kwame Mensah" (discovery_call, 56d idle) from the dashboard's needs-attention
   list — drawer opened in place, no navigation, no page reload.
2. Clicked **Mark followed up** → row optimistically disappeared from the list
   immediately; confirmed via direct Supabase query that a real `activity_log` row was
   written: `from_status=discovery_call, to_status=discovery_call, note="Marked as
   followed up"`. List count dropped from 20 → 19 rows, matching the removed lead.
   Drawer stayed open and its own Activity timeline updated to show the new entry —
   correct per the "drawer never clears on close" pattern.
3. Opened "Rahul Mehta" (proposal, 43d idle), typed a custom note, clicked **Save
   note** (no stage change) → confirmed `activity_log` row written with
   `from_status=to_status=proposal` and the exact note text — the "Save note" button
   was correctly disabled while the textarea was empty.
4. On the same lead, clicked **Won** → confirmed both `contacts.status` updated to
   `won` and a `from_status=proposal, to_status=won` activity_log row was written in
   the same action.
5. Same server actions (`updateLeadStatus`, `addLeadNote`, `markLeadFollowedUp`) and
   the same optimistic-update-with-rollback pattern are shared between
   `needs-attention-table.tsx` and `leads-board.tsx` (`/admin/leads`) — confirmed by
   code review that both call sites revert local state and surface `result.error` on
   failure, so the two surfaces can't drift.
6. All test writes from steps 2–4 were reverted (activity_log rows deleted, Rahul's
   status restored to `proposal`) before ending the session.

No bugs found in this surface. This is the part most likely to hide a bug (client
state plus two server actions plus a shared drawer) and it held up under direct
DB verification, not just UI appearance.

## Funnel diagnostics — verified against live data
Independently recomputed `buildFunnelStats`' algorithm in a sandboxed script pulling
raw `contacts`/`activity_log` rows directly from the Supabase REST API (bypassing the
app entirely), rather than trusting the app's own math. Result matched the dashboard's
rendered numbers to the decimal:

- Counts (furthest stage reached, cumulative): New lead 36, Contacted 24, Discovery
  call 16, Proposal 12, Won 8.
- Conversion from prior stage: 67% / 67% / 75% / 67%.
- Median days in stage: 4 / 4 / 4 / 4 / — (no completed "Won" stays yet, correctly
  shown as "no completed stays yet" rather than 0 or a misleading number).

## Source capture — verified end to end
1. Confirmed "first touch only" semantics hold even across an accidental early
   navigation in the same test session: a stray 404 hit (my own typo'd URL) got
   captured as first-touch and correctly was NOT overwritten by the next, correct
   navigation — this is the exact behavior the spec requires (referrer/landing page
   must reflect true first arrival, not the last page before submit).
2. Fresh session: navigated directly to a blog post with UTM params
   (`/blog/scoping-custom-ai-projects?utm_source=twitter&utm_medium=social&utm_campaign=qa_test`),
   confirmed `sessionStorage.jasper_first_touch` captured all three UTM fields plus
   `landing_page: "/blog/scoping-custom-ai-projects"`.
2. Clicked the blog post's CTA → contact form → filled out and submitted a real
   inquiry → queried Supabase directly and confirmed `contacts.metadata` contained
   exactly `{utm_source: "twitter", utm_medium: "social", utm_campaign: "qa_test",
   landing_page: "/blog/scoping-custom-ai-projects"}` (no `referrer` key, correctly
   omitted since this was a direct navigation with no referrer — matches the
   "dropped when absent rather than writing empty strings" behavior in
   `contact.ts`).
3. Lead drawer's "True source" field for this contact would read `twitter / qa_test`
   per `trueSourceLabel()`'s utm_source-wins logic (verified by code review of
   `pipeline.ts` lines 245–265; not re-screenshotted since the test contact was
   deleted immediately after the metadata check to keep the DB clean).
4. Test contact + person rows deleted after verification.

## Digest email — verified via `?preview=1`
- `GET /api/cron/digest?preview=1` with no `Authorization` header → 401.
- Same request with a wrong bearer token → 401.
- Same request with the correct `Bearer $CRON_SECRET` (set temporarily in
  `.env.local`, removed afterward, dev server restarted to drop it) → 200, rendered
  HTML.
- Rendered digest visually matches the Apple-minimalist style guide: clean KPI row
  with three metrics and green/red deltas, a compact CSS-only funnel with per-stage
  counts and conversion %, and a "Needs attention (20)" section correctly split into
  CRITICAL (14) and WORTH A NUDGE (6) groups, sorted most-overdue-first within each
  group — numbers match the dashboard's needs-attention list exactly (same
  `computeStaleness` source of truth, confirmed by code review).
- No `<img>` tags in the rendered HTML — table/CSS-only layout, so it will render
  correctly with remote images blocked, per spec.
- Confirmed each stale-lead row is a real `<a href="…/admin/leads?lead=<contact-id>">`
  deep link (grepped the rendered HTML for real contact UUIDs, not placeholders).
  Clicked one directly (`/admin/leads?lead=e21fa60b-...`) and confirmed it opens that
  exact lead's drawer on load — `leads/page.tsx` reads the `?lead=` query param via
  `initialOpenId` and `LeadsBoard` seeds both `openId` and `cachedLead` from it so the
  drawer doesn't flash empty on first render.
- "A lead acted on today does not appear in tomorrow's digest": not tested against a
  literal 24-hour clock skip (impractical in this session), but verified structurally:
  the digest calls the exact same `computeStaleness()` function the dashboard's
  needs-attention list uses, seeded from the same `activity_log` table, and I directly
  observed in the interactive-drawer test above that a `markLeadFollowedUp` action
  writes a fresh `activity_log` row that immediately removes the lead from the
  dashboard's needs-attention list. Since the digest's staleness math is the same
  function over the same table, a lead followed up today is idleDays=0 tomorrow's run
  and cannot re-appear as stale unless it goes idle past its threshold again — this is
  a structural guarantee, not a coincidence of the two features agreeing by chance.

## Auth / login gate
- `/admin` and `/admin/leads` with no session cookie → 307 to `/admin/login` (curl,
  no browser state) — confirmed no regression.
- `/api/cron/digest` is the one intentional exception to "behind `/admin`'s login" —
  confirmed this is correct per spec: Vercel Cron cannot carry a browser session
  cookie, so the route implements its own `Authorization: Bearer $CRON_SECRET` check
  instead (returns 500 if `CRON_SECRET` isn't configured, rather than silently running
  unprotected — good defensive default). No other new route or component bypasses the
  admin gate.

## Edge cases tested
- Save-note button correctly disabled when the note textarea is empty.
- Optimistic UI rollback path exists in both `needs-attention-table.tsx` and
  `leads-board.tsx` for all three actions (status move, note, mark-followed-up) — on
  server-action failure, the optimistic activity_log entry is removed, the lead is
  un-hidden from the needs-attention list, and an inline error message is shown. Not
  exercised via an induced server failure in this session (would require e.g. revoking
  the service-role key mid-test); flagged below as the one gap.
- `trueSourceLabel()`'s fallback chain (utm_source → blog landing_page → referrer
  hostname → generic landing_page → null) reviewed line-by-line against the spec's
  "true source wins over self-reported" rule and confirmed correct by code reading;
  the utm_source and blog-landing-page branches were also exercised live.
- Funnel's "no completed stays yet" median-time null case (Won stage, since nothing
  has ever left Won) renders as a clear message rather than `0d` or blank — good, no
  silent-zero bug.

## Manual verification required (flag to human)
- [ ] Visual/pixel-level check of the digest email in an actual email client (Gmail,
      Outlook, Apple Mail) — this session only rendered the HTML in a browser tab via
      `?preview=1`, which is a good proxy but not identical to real email-client CSS
      support.
- [ ] The rollback path on a genuine server-action failure (network blip, RLS
      rejection) was reviewed in code but not triggered live in this session.
- [ ] A literal next-day digest run was not observed (only structurally verified via
      shared `computeStaleness`) — worth a real overnight check once this ships.

## Known issues / follow-ups
- Engineering-docs convention gap: this task's `TECH-PLAN.md`, `EXEC-PLAN.md`, and
  `CHANGELOG.md` were missing from
  `docs/engineering/changes/2026-07/2026-07-17-build3-pipeline-dashboard/` at the
  start of this QA pass. Not a functional defect, but Developer should backfill them
  so the audit trail matches every other shipped task.
- No other issues found. Ship it.
