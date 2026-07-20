# Jasper AI — Epic Status

Last updated: 2026-07-16 19:15
Phase in flight: Build 3 (E4) — all three sub-items code-complete; remaining work is operational (routine registration + first live cycles)

> **PM note (2026-07-15):** This file did not exist before today's run.
> `docs/product/epics.md` and `docs/product/product.md` also do not exist yet —
> only `docs/product/product-plan.md` (BUILD 1 / BUILD 2 spec) is present.
> Rather than inventing a full epics/product strategy doc without a
> stakeholder interview, this file maps the existing BUILD sections in
> `product-plan.md` to epics (originally the two BUILD sections → E1/E2;
> since extended to E3 for the ad-hoc dashboard and E4 for BUILD 3) and
> tracks them against real git history,
> `CLAUDE.md`, and the engineering QA reports under `docs/engineering/changes/`.
> Recommend a proper first-run product-strategy session (product.md + epics.md)
> with the operator when time allows — flagged as an open decision below.

Every epic passes through five stages. Each is a gate — ask "is it true?" before moving forward.

| Stage | Gate question |
|-------|---------------|
| 1 · Specified | Is there a written spec with acceptance criteria? |
| 2 · In flight | Is active development underway? |
| 3 · Feature-complete | Does it meet every acceptance criterion? |
| 4 · Tested | Have all tests passed (unit + integration + QA)? |
| 5 · Shipped | Is it deployed and measurably impacting users? |

Status glyphs: 🔄 in flight · ✅ done · ⏳ partially done · ☐ planned · 🛑 paused

## At a glance

| Epic | Status | % done (est) | Pipeline | Open bugs | Closed bugs | Notes |
|---|---|---|---|---|---|---|
| E1 · Build 1 — Prove the loop | ✅ done | 100% | ●●●●● | 0 | 0 | Live, verified 2026-07-14 against production domain |
| E2 · Build 2 — Run the business from /admin | ⏳ partially done | 75% | ●●●○○ | 0 | 2 | Migrations now applied per `CLAUDE.md`; still no formal QA-REPORT for Orders/People/Newsletter/nav/Resend scope |
| E3 · Admin Dashboard & Analytics (new) | ✅ verified | 90% | ●●●●○ | 0 | 1 | Shipped in commit `bdfff3d` (2026-07-15); all 9 QA acceptance items now PASS (2026-07-16) — **unblocks E4**. Remaining 10%: fix is uncommitted, and not yet reflected in `CLAUDE.md` Build catalog / `docs/product/epics.md` |
| E4 · Build 3 — Leverage the dashboard to grow lead generation | 🔄 in flight | 90% | ●●●●○ | 0 | 0 | All three sub-items code-complete 2026-07-16 (E4.1 PR #12, E4.2 PR #11, E4.3 pipeline-proof PR #13 + channel-signal script built). Remaining is operational: register `dashboard-baseline-weekly` (E4.1) and `content-brief-weekly` (E4.3) — corrected 2026-07-20, neither was actually registered despite prior claims — + observe one live cycle each |

## Drilldown

### E1 · Build 1 — Prove the loop — ✅ 100%

**Shipped:**
- Contact form on the live marketing site writes a `People` row (upserted by email) + linked `Contacts` row
- Custom attributes (`how_they_heard`, `company_size`, `estimated_budget`) saved correctly in `attributes` jsonb
- New leads land in `new_lead` status
- `/admin` gated behind Supabase Auth (email/password, seeded account `jasper.le@edge8.ai`)
- Admin leads view (now a Kanban board with drawer) shows submissions newest-first

**Outstanding:** none — closed out.

**Definition of done:** Cold-start submit-to-visible in under 60 seconds; two submissions from the same email produce one person, not two; verified live 2026-07-14 (see `CLAUDE.md` Build catalog).

**Closed bugs:** None recorded against this epic.

### E2 · Build 2 — Run the business from /admin — ⏳ 75%

**Shipped (per commit `acf8f50` and prior kanban work):**
- `activity_log` table + `updateLeadStatus` action (kanban board, 2026-07-14)
- Orders table (migration `0003`) + admin Orders page (lookup-by-email, record purchase, newest-first)
- People directory: searchable by name/email/company, shows custom attributes, per-person drawer with full history
- Newsletter page: everyone with `ok_to_contact = true`
- `/admin` restructured into a `(dashboard)` route group with shared nav/logout
- Resend wired: best-effort internal notification email to `jasper.le@edge8.ai` on every contact-form submit (non-blocking)

**Outstanding:**
- ✅ RESOLVED 2026-07-15: migrations `0002_build2_activity_log.sql` and `0003_build2_orders.sql` applied to production Supabase via the Supabase MCP (per `CLAUDE.md` catalog) — 0002 had never actually run before this
- No QA-REPORT exists yet for the Orders/People/Newsletter/Resend-notification/nav-restructure scope (commits `acf8f50`, `6112228`, `fd98971`) — QA has only covered the earlier kanban-board work. `CLAUDE.md` describes a manual end-to-end check (order recorded, activity_log row confirmed, all sections gated) but this is not a filed QA-REPORT and predates the redesign below
- The Apple-minimalist redesign (commits `3cf6201`, `b565411`, `9b3c93a` — marketing site + admin visual overhaul) merged 2026-07-15 09:26–09:42 with no engineering-changes doc and no QA pass
- Visitor-facing confirmation email deliberately deferred until `jasper-ai.com` is purchased and verified as a Resend sending domain (by design, not a defect)

**Definition of done:** All four `/admin` surfaces (People, Contacts, Orders, Newsletter) visible, usable, and behind login; a lead can be run from first inquiry to won without leaving `/admin`; a real confirmation email arrives after a test submission with `jasper-ai.com` as sender; nothing in `/admin` reachable without logging in.

**Closed bugs:**
- Resend sandbox-mode 403 sending to `jasper.le@edge8.ai` instead of the API key's own registered address · fixed in commit `6112228`
- Notification email pointed at the wrong address after the operator updated their Resend account email · fixed in commit `fd98971`

### E3 · Admin Dashboard & Analytics — ✅ 90%

> New epic, not yet formalized in a proper epics.md (which still does not exist for this project). Scoped ad hoc in `docs/plans/2026-07-15-admin-dashboard-design.md` and shipped same-day in commit `bdfff3d`. Tracking here so it isn't lost between "merged" and "actually verified."

**Shipped (per commit `bdfff3d`, 2026-07-15 15:35):**
- `/admin` root becomes a Dashboard: KPI row (new leads this week, open pipeline, revenue this month, newsletter subscribers), leads-over-time chart, conversion funnel, revenue-by-month, how-they-heard breakdown, needs-attention list
- Leads Kanban board moved to `/admin/leads`
- Server-side pagination + search/filter on Orders, People, Newsletter
- Faster auth via local JWT verification (`getClaims`) in the proxy middleware
- Loading skeletons on every admin tab; Orders "Add order" form moved into a drawer

**Verified 2026-07-16 — QA-REPORT filed:** all 9 acceptance items PASS against direct Supabase queries — KPI totals (open pipeline, newsletter subscribers exact match), conversion-funnel "furthest stage reached" logic (independently reimplemented, matches including lost-lead crediting), revenue-by-month (2-month spot check exact), how-they-heard breakdown (exact), needs-attention staleness (fixed and re-verified, see closed bugs below), and auth gating on all 5 admin routes (no leak, all redirect to login). Full report: `docs/engineering/changes/2026-07/2026-07-16-admin-dashboard-verification/QA-REPORT.md`.

**Outstanding (10%):**
- The needs-attention fix (see closed bugs) is verified but still **uncommitted** in the working tree — not shippable until committed and pushed via PR
- Non-blocking, needs an operator labeling decision: "New leads this week" / "Revenue this month" KPIs are trailing 7/30-day windows, not calendar periods (e.g. Revenue showed $89k trailing-30d vs. $56k July-to-date, a $33k gap) — flagged in the QA-REPORT, not a defect, but could mislead if read as calendar-period
- Not yet reflected in `CLAUDE.md`'s Build catalog or in a proper `docs/product/epics.md` entry

**Definition of done:** Dashboard KPI/funnel/revenue figures independently confirmed against direct Supabase queries ✅; `/admin` root, `/admin/leads`, `/admin/orders`, `/admin/people`, `/admin/newsletter` all still gated behind login (no auth regression from the `getClaims` change) ✅; a QA-REPORT filed ✅. Epic is functionally done pending the fix being committed.

**Closed bugs:**
- `buildNeedsAttention()` in `website/src/lib/dashboard.ts` computed all leads idle ≥7 days correctly (14) but hard-capped the returned list at 8 via `.slice(0, 8)` with no count or "+N more" indicator, silently hiding 6 of 14 (43%) from the operator · fixed 2026-07-16 by removing the cap and making the dashboard card subtitle show the live total · independently re-verified by QA against direct Supabase queries (14/14 match) · merged via PR #11, live in production

### E4 · Build 3 — Leverage the dashboard to grow lead generation — 🔄 90%

> Rescoped 2026-07-16, replacing the original manual-weekly-ritual framing. Specified in `docs/product/product-plan.md` under "BUILD 3 — Leverage the dashboard to grow lead generation". This build formally amends the "no analytics dashboards" exclusion in the product plan and splits into three separately-scoped, automated pieces, each with its own readiness state below.

> **Entry gate (hard dependency on E3) — CLEARED 2026-07-16:** the E3 dashboard verification passed all 9 acceptance items, including the needs-attention fix, independently re-verified by QA against direct Supabase queries, and merged to production via PR #11 (see `docs/engineering/changes/2026-07/2026-07-16-admin-dashboard-verification/QA-REPORT.md`). All three sub-items are now code-complete; what remains is operational, not engineering (see "Outstanding").

**Shipped:** E4.1 (weekly baseline + funnel-leak flag, PR #12), E4.2 (needs-attention visibility, PR #11), and E4.3's pipeline-proof precursor (first blog post live on `/blog`, PR #13) — all merged to production. E4.3's channel-signal script and routine file are also committed (`6fb28e5`). **Correction (2026-07-20): neither E4.1's `dashboard-baseline-weekly` nor E4.3's `content-brief-weekly` is actually registered as a local scheduled task** — a direct check of `~/.claude/scheduled-tasks/` shows neither directory exists; this doc previously claimed E4.1 was registered with a next-run date, which was wrong. Both remain pending Desktop registration.

**Sub-items:**

**E4.1 · Weekly baseline + funnel-leak flag — ✅ live (2026-07-16)**
- What it does: a scheduled job computes inquiries/week and per-stage conversion rates, and flags the pipeline stage with the largest stage-to-stage drop-off, writing results to a durable weekly log.
- Script: `website/scripts/weekly-dashboard-baseline.mjs` — verified against live Supabase (11 inquiries this week; funnel counts matched E3's QA-verified numbers exactly: 36/24/16/12/8).
- First real log: `docs/product/dashboard-baselines/2026-07-16.md`. Found an honest 3-way tie at 33% drop (new_lead→contacted, contacted→discovery_call, proposal→won) — reports the tie rather than silently picking one.
- The system flags the leaking stage only — it never fixes it; the process fix stays a permanent human decision.
- Intended as a persistent local routine (`dashboard-baseline-weekly`, Mondays 8:07 AM) that runs the script and opens a PR (never auto-merges — same convention as `writer-weekly`) — **but as of 2026-07-20 it is NOT registered under `~/.claude/scheduled-tasks/`.** No such directory exists on disk; this was previously (incorrectly) reported as live.
- Weekly log location: `docs/product/dashboard-baselines/`, one file per week, decided 2026-07-16.

**E4.2 · Needs-attention visibility — ✅ done (2026-07-16, shipped as a side effect of the E3 fix)**
- What it does: makes the ≥7-day-stale lead list impossible to miss directly on the dashboard UI (reuses the existing Supabase-backed dashboard) rather than pushing an external notification.
- Delivered by PR #11 (the E3 needs-attention truncation fix): `buildNeedsAttention()` no longer caps the list, and the dashboard card shows a live count. No separate work needed.
- A Lark/Slack push notification was considered and set aside — `LARK_*` env vars are blank in this project per the `CLAUDE.md` catalog. Remains a future option, not this build's scope.

**E4.3 · Channel-biased content briefs — ✅ built & QA-verified (2026-07-16), pending registration**
- What it does: reads the how-they-heard breakdown and proposes a content brief whose topic/angle/format is biased toward the top-producing channel, feeding the existing Mon(writer)/Tue(designer)/Wed(web-publisher) schedule. Publishes to the `/blog` section at `website/src/app/blog/...` (App Router — not `website/pages/blog/...`, corrected in `agents/web-publisher/context/persona.md`). Not an email channel; email/newsletter stays separately blocked on the `jasper-ai.com` domain purchase.
- **Precursor CLEARED:** the writer → designer → web-publisher pipeline ran end-to-end for the first time — first post ("Why Most Custom AI Projects Never Ship") live on `/blog` (PR #13). Established the blog page conventions every future post follows. (Published without a hero image — Gemini image generation is blocked on a Google Cloud billing/quota issue; out of scope, operator deprioritized it.)
- Built: `website/scripts/channel-signal.mjs` (ranks channels, honest tie/thin-data/small-margin handling, tunable `CHANNEL_STRATEGY` mapping) + `website/scripts/E4.3-content-brief-routine.SKILL.md` (the `content-brief-weekly` routine, Sun 7:07 PM, ahead of the Mon writer run). QA independently re-queried Supabase and matched every channel bucket (26/26 classified).
- Current live signal is deliberately WEAK: Referral (8) leads LinkedIn (7) by only 1 — below the confidence margin — so the script refuses to force a channel angle and defaults to evergreen positioning. Correct behavior at this data volume, not a bug.
- Proposes a brief via an open PR for human review; never silently injects a topic into the writer's auto-queue. Automation stops at the open PR — the go-live `git push`/merge is always a human action, per this project's engineering rules.

**Outstanding (operational, not engineering):**
- Register two local routines in Claude Desktop (cannot be done from the VS Code/CLI session): `dashboard-baseline-weekly` (E4.1) and `content-brief-weekly` (E4.3, content of `website/scripts/E4.3-content-brief-routine.SKILL.md`) — **both still pending as of 2026-07-20**, verified against `~/.claude/scheduled-tasks/` (neither directory exists there).
- Also pending Desktop registration as of this Phase 1 pass: `linkedin-repurpose-weekly` (content of `website/scripts/E-linkedin-repurpose-routine.SKILL.md`) and the `writer-weekly` cadence change from weekly to biweekly.
- Observe one full live cycle of each routine once registered — spot-check the first automated PR each opens.

**Ops health check:** ✅ CI/CD and production healthy — 2026-07-20 06:03 (latest Vercel production deployment READY, `https://jasper-ai-neon.vercel.app` returned HTTP 200; no `.github/workflows` configured in this repo so no CI runs to check; no open PRs)

**Definition of done:** E3 dashboard numbers (including the needs-attention count) match direct Supabase queries with a QA-REPORT filed; E4.1 runs on schedule and writes a durable weekly log with the leak flagged (never auto-fixed); E4.2 makes stale leads (≥7 days) impossible to miss on the dashboard itself; E4.3's precursor post is live on `/blog` before its automation is built, and its automation stops at a staged commit, never an autonomous push.

**Out of scope (explicit):** email nurture of any kind (newsletter sends, sequences, visitor confirmation email) — blocked until `jasper-ai.com` is purchased and verified as a Resend sending domain; paid acquisition; any new dashboard feature beyond what E4.1/E4.2 and the E3 verification step force.

**Operator-tunable:** the 7-day staleness threshold is the operator's call, not fixed law — adjust if real volume argues for it and note the change in `product-plan.md`.

**Closed bugs:** None recorded against this epic.

## Obsolete / won't fix

| Item | Reason dropped | Date |
|---|---|---|
| — | none yet | — |

## How this file gets updated

This file is updated by the product-manager agent every weekday at 7:03 AM as part of the daily-plan routine, and by the developer agent whenever an epic's pipeline stage or bug count changes as a result of shipped work. A status change is triggered by: a migration being run against production, a QA-REPORT being filed, or a feature being verified live. Do not delete drilldown sections for completed epics — leave them with the closing date for institutional memory.
