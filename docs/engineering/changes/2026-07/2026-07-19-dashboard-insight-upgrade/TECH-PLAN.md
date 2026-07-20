# TECH-PLAN: Dashboard insight upgrade + homepage blog section

Spec: `docs/superpowers/specs/2026-07-17-dashboard-modern-redesign-design.md`
(operator-reviewed and approved 2026-07-19)

## Scope

Two independent, additive changes to the live app. No visual/theme
changes — every color/spacing token used is already in `globals.css`.
No new tables or migrations.

1. Restructure `/admin` dashboard: reorder into labeled sections, add
   "Leads created vs. Won" chart, merge "Source quality" + "How they
   heard" into one "Source performance" widget, add "Content
   attribution" table.
2. Add a "latest 3 posts" section to the public homepage.

## Files to touch

### Dashboard
- `website/src/lib/dashboard.ts` — add `leadsVsWon` time-series query
  (leads created per week + cumulative won count, ~10-week window,
  from `contacts`/`activity_log`); add `contentAttribution` query
  (same shape as existing `sourceQuality`, grouped by
  `contacts.metadata->>'landing_page'` instead of source); keep
  existing `sourceQuality` and `sources` (how-they-heard) queries as
  data sources feeding the new merged widget — merge happens at the
  widget layer, not by deleting either query, since both still supply
  distinct fields (sourceQuality has win-rate/revenue, sources has the
  self-reported category breakdown used as the "source" key).
- `website/src/app/admin/(dashboard)/dashboard-widgets.tsx` — add
  `LeadsVsWonChart` component (SVG line+area, two series, explicit
  y-axis count labels + x-axis week labels — no dual axis); add
  `SourcePerformance` component (grouped bars: leads bar + win-rate bar
  per source, revenue printed as text); add `ContentAttributionTable`
  component (same structure as existing `SourceQualityTable`, different
  column header and grouping key). Remove `SourceBars` (how-they-heard)
  and old `RevenueBarChart`/`SourceQualityTable` call sites are NOT
  removed as components — `RevenueBarChart` stays as-is, just
  relocated; `SourceQualityTable` component itself can be deleted since
  `SourcePerformance` fully replaces its call site (confirm no other
  page imports it before deleting — check `/admin/leads` etc.).
- `website/src/app/admin/(dashboard)/page.tsx` — restructure the JSX
  into the four labeled sections per the spec's ordering, replacing
  the current single flat list of `Card` rows. Add a `section-label`
  style (small uppercase, `text-[var(--gray-1)]`, matching the
  established type scale — this is new markup, not a new design
  token).
- `website/src/app/admin/(dashboard)/needs-attention-table.tsx` — no
  logic change, just moves earlier in `page.tsx`'s JSX order.

### Homepage
- `website/src/app/page.tsx` — new `<section>` inserted after the FAQ
  section (~line 303) and before the "CTA BAND" section (~line 305),
  pulling `getAllPosts().slice(0, 3)` from `@/lib/blog` (already used
  by `blog/page.tsx`), same date-formatting (`formatPostDate`) and
  card/link conventions as the blog index. "View all posts →" link to
  `/blog`. Renders fewer cards (not empty slots) when fewer than 3
  posts exist.

## Explicit non-goals for this change (see spec for full list)

- No color/font/spacing changes anywhere.
- No changes to Leads/People/Orders/Newsletter pages.
- No changes to the digest email.
- No new Supabase migration — content attribution reads existing
  `contacts.metadata` jsonb.
- No dual-axis or bubble/scatter charts.

## Verification plan (hand to QA after implementation)

1. Leads-vs-Won chart numbers match direct Supabase queries against
   `contacts`/`activity_log` for the same 10-week window.
2. Content-attribution numbers match direct queries against
   `contacts.metadata->>'landing_page'`.
3. Source-performance widget's leads/win-rate/revenue per source match
   exactly what the old Source-quality table showed pre-change (this is
   a display/layout change, not a math change).
4. Needs-attention's in-place actions (status change / note / mark
   followed up) still each write exactly one `activity_log` row after
   being moved earlier in the page.
5. Homepage section renders correctly with today's 1 published post
   (no broken empty grid cells), and QA fakes a 2nd/3rd post locally to
   confirm the 3-card layout also renders correctly.
6. Auth regression: `/admin` still requires login; homepage section is
   public as expected (no new logged-out admin surface).
7. No new hex color values introduced anywhere in the diff — grep the
   diff for `#` outside of existing token definitions.

## Rollout

Same as BUILD 3: developer implements → self-verifies (build/typecheck/
lint clean) → QA agent runs the verification plan above → operator
reviews unstaged diff → operator decides on commit/push (not automatic).
