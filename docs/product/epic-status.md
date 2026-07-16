# Jasper AI — Epic Status

Last updated: 2026-07-16 07:03
Phase in flight: Build 2 (Make it the system I run the business from) + new Admin Dashboard scope

> **PM note (2026-07-15):** This file did not exist before today's run.
> `docs/product/epics.md` and `docs/product/product.md` also do not exist yet —
> only `docs/product/product-plan.md` (BUILD 1 / BUILD 2 spec) is present.
> Rather than inventing a full epics/product strategy doc without a
> stakeholder interview, this file maps the two existing BUILD sections in
> `product-plan.md` to epics E1/E2 and tracks them against real git history,
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
| E3 · Admin Dashboard & Analytics (new) | 🔄 in flight | 50% | ●●○○○ | 0 | 0 | Shipped in commit `bdfff3d` (2026-07-15); zero verification of KPI/funnel/revenue math, no QA-REPORT |

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

**Ops health check:** ✅ CI/CD and production healthy — 2026-07-16 10:47 (latest Vercel production deployment Ready, 19h old, HTTP 200 on https://jasper-ai-neon.vercel.app; no GitHub Actions workflows configured in this repo — deploys flow through Vercel's GitHub integration directly; no open PRs)

**Definition of done:** All four `/admin` surfaces (People, Contacts, Orders, Newsletter) visible, usable, and behind login; a lead can be run from first inquiry to won without leaving `/admin`; a real confirmation email arrives after a test submission with `jasper-ai.com` as sender; nothing in `/admin` reachable without logging in.

**Closed bugs:**
- Resend sandbox-mode 403 sending to `jasper.le@edge8.ai` instead of the API key's own registered address · fixed in commit `6112228`
- Notification email pointed at the wrong address after the operator updated their Resend account email · fixed in commit `fd98971`

### E3 · Admin Dashboard & Analytics — 🔄 50%

> New epic, not yet formalized in a proper epics.md (which still does not exist for this project). Scoped ad hoc in `docs/plans/2026-07-15-admin-dashboard-design.md` and shipped same-day in commit `bdfff3d`. Tracking here so it isn't lost between "merged" and "actually verified."

**Shipped (per commit `bdfff3d`, 2026-07-15 15:35):**
- `/admin` root becomes a Dashboard: KPI row (new leads this week, open pipeline, revenue this month, newsletter subscribers), leads-over-time chart, conversion funnel, revenue-by-month, how-they-heard breakdown, needs-attention list
- Leads Kanban board moved to `/admin/leads`
- Server-side pagination + search/filter on Orders, People, Newsletter
- Faster auth via local JWT verification (`getClaims`) in the proxy middleware
- Loading skeletons on every admin tab; Orders "Add order" form moved into a drawer

**Outstanding:**
- No verification yet that the KPI numbers, conversion-funnel "furthest stage reached" logic, and needs-attention staleness fallback actually match direct Supabase queries — this was explicitly flagged as a required check in the design doc's own Verification section and has not been done
- No QA-REPORT and no `docs/engineering/changes/` entry exists for this commit at all (no TECH-PLAN/EXEC-PLAN/CHANGELOG either) — it shipped straight to `main` with no paper trail
- Not yet reflected in `CLAUDE.md`'s Build catalog or in a proper `docs/product/epics.md` entry

**Definition of done:** Dashboard KPI/funnel/revenue figures independently confirmed against direct Supabase queries; `/admin` root, `/admin/leads`, `/admin/orders`, `/admin/people`, `/admin/newsletter` all still gated behind login (no auth regression from the `getClaims` change); a QA-REPORT filed.

**Closed bugs:** None recorded against this epic.

## Obsolete / won't fix

| Item | Reason dropped | Date |
|---|---|---|
| — | none yet | — |

## How this file gets updated

This file is updated by the product-manager agent every weekday at 7:03 AM as part of the daily-plan routine, and by the developer agent whenever an epic's pipeline stage or bug count changes as a result of shipped work. A status change is triggered by: a migration being run against production, a QA-REPORT being filed, or a feature being verified live. Do not delete drilldown sections for completed epics — leave them with the closing date for institutional memory.
