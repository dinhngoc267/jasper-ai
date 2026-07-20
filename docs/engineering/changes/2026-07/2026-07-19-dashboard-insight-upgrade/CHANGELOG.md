# CHANGELOG — Dashboard insight upgrade (charts, chart types, per-chart period)

Date: 2026-07-19 → 2026-07-20
Scope: `website/src/app/admin/(dashboard)/` + `website/src/lib/{dashboard,pipeline}.ts`
Rendering/UX + one data-logic refinement. No changes to the digest email, or to
Leads/People/Orders/Newsletter pages.

## Charts → Recharts
- Migrated the 4 live dashboard charts from hand-rolled inline SVG to **Recharts
  3.9.2** (added to `website/package.json`). `dashboard-widgets.tsx` is now a
  client component. Deleted the dead `LeadsAreaChart`.
- **Leads created vs. won** → `ComposedChart` (blue-gradient area for leads +
  green line for won, `type="monotone"`, `CartesianGrid`, hover tooltip,
  "Leads / deals (count)" caption).
- **Conversion funnel** → real Recharts `FunnelChart` (tapering shape) with
  always-visible side labels: stage · count, conversion-from-prior · median days.
- **Source performance** → `ComposedChart` combo: leads as bars (left axis) +
  win-rate % as a line (right axis, fixed 0–100). **Revenue removed** from this
  card — per-source revenue attribution is ambiguous and lives in the Revenue
  chart / KPI instead; bars now label lead count.
- **Revenue** → `BarChart` with a Power BI-style restyle: vertical blue gradient
  (opacity of `--blue`, no new hex), cream ghost-column track, rounded tops,
  above-bar value + colored MoM delta labels, hover highlight.
- Colors come only from existing `globals.css` tokens.

## Per-chart, independent period control
- Removed the single global Week/Month/Quarter toggle. Each **time-series**
  widget now owns an independent toggle written to its own URL param:
  Key metrics `?kpi`, Leads-vs-won `?leads`, Revenue `?revenue`,
  Source performance `?source`. `period-toggle.tsx` gained `param` + `size` props.
- **Snapshot** widgets stay all-time (no toggle, gray "All time" pill):
  Conversion funnel, Content attribution. A trailing-window funnel misleads on
  short periods (cohort maturation), so it is deliberately kept all-time.
- Key metrics is now a titled `Card` (toggle in its header, matching every other
  card); the 4 KPIs render as inset tiles inside it. `Card` gained an `action`
  header slot.

## Data logic (`lib/dashboard.ts`, `lib/pipeline.ts`)
- `fetchDashboardData` now takes `{ kpi, leads, revenue, source }` periods.
- `buildSourceQuality` takes an optional trailing window: leads + win rate are
  scoped to the **cohort of leads created in the window**.
- Win rate now counts a lead as "won" if its status is `won` **OR** the person
  produced a paid order — so win rate reflects actual outcomes and can no longer
  contradict revenue.
- `buildFunnel` is all-time. `buildFunnelStats` (shared with the digest email)
  is unchanged; the digest does not call `buildSourceQuality`.

## Verification
- `npm run build` ✅ · `npx tsc --noEmit` ✅ · dashboard files lint clean.
- Full QA regression pass: all 4 charts render with working tooltips; the 4
  independent toggles each change only their own chart; sparse cohorts (e.g.
  `?source=week`) render without crashing; other admin pages, public homepage,
  blog post, and the digest email all regression-clean; zero console errors.
  Verdict: GO for production.

## Known follow-up (non-blocking)
- `leads-board.tsx:119` — optimistic id uses `Date.now()` during render
  (`react-hooks/purity` lint error, pre-existing in BUILD 3). Does not block the
  build (Turbopack `next build` does not run eslint; no CI lint gate). Fix by
  generating the id outside render (`crypto.randomUUID()` / ref counter).
