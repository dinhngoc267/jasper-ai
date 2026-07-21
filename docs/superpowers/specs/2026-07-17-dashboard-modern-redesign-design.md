# Design: Dashboard insight upgrade + homepage blog section

Date: 2026-07-17
Status: Draft — awaiting operator review
Supersedes: an earlier draft of this doc that proposed a full visual
redesign ("Preset 1B Modern") across marketing/blog/admin/email. That
direction was explored via prototypes and explicitly rejected by the
operator in favor of what's below — keep the current live visual style
everywhere, improve only the dashboard's content/layout and add one
homepage section.

## Why

BUILD 3 shipped the dashboard's data/behavior (funnel diagnostics,
actionable needs-attention, source capture, digest email, blog CTA) inside
the existing look of `/admin`. Two gaps surfaced after living with it:

1. The dashboard shows *that* leads are decaying and *that* the funnel
   leaks, but doesn't show whether rising lead volume is actually turning
   into won deals over time, and doesn't show which blog post specifically
   is producing leads that close — even though source-capture data for
   that already exists in `contacts.metadata`.
2. The page's layout doesn't reflect priority — the single most
   actionable thing (needs-attention) was buried below passive charts,
   and two widgets (source-quality table, how-they-heard bars) show
   overlapping information without a clean single view.

**No visual redesign.** Every token below (`--ink #1d1d1f`, `--blue
#0071e3`, `--cream #f5f5f7`, `--paper #ffffff`, `--rule
rgba(0,0,0,.07)`, status colors green/amber/red/purple) is copied
verbatim from the live `globals.css` and the real component markup in
`dashboard-widgets.tsx` / `nav-links.tsx` / `layout.tsx` — this is a
content and information-architecture change, not a theme change.

## Dashboard (`/admin`) — new layout

Grouped into labeled sections (a plain uppercase label, not a numbered
badge — a label explains *why* things are grouped, a number doesn't).
Order reflects urgency: act → diagnose → understand channels → historical
context.

**KPI row** — unchanged (new leads, open pipeline, revenue MTD,
newsletter subscribers, period toggle). Sits above any section label,
since it's the page's header-level summary, not a section itself.

**Section: "Act now"**
- **Needs attention** — promoted from 4th position to directly under the
  KPI row. This is the single highest-leverage widget on the page; BUILD
  3's whole premise was killing the failure mode of leads decaying while
  the dashboard only described the decay, so it shouldn't be out-ranked
  by passive charts. No logic change — same table, same in-place actions
  (change status / add note / mark followed up), same
  `updateLeadStatus`/`addLeadNote`/`markLeadFollowedUp` server actions.

**Section: "Pipeline health"**
- **Leads created vs. Won (NEW)** — replaces "Leads over time" in the
  same `Card` slot/position. A combo line+soft-area chart: two series
  (leads created, won — cumulative) on one shared count axis (deliberately
  *not* a dual-axis chart — overlaying two different scales on one chart
  invites false visual correlation, a well-known data-viz pitfall).
  Weekly buckets, ~10-week window. Includes y-axis count labels and
  x-axis week labels (the original "Leads over time" chart had no axis
  labels at all — an oversight caught during prototyping — this one and
  every future chart should always label both axes).
- **Conversion funnel** — unchanged (stage-to-stage conversion rate +
  median time-in-stage, from `activity_log`).

**Section: "Channel performance"**
- **Source performance (NEW, merges two widgets)** — replaces both
  "Source quality" table and "How they heard" bars, which were redundant
  (how-they-heard was a strict subset of source-quality's lead-count
  dimension). One widget per source: a "Leads" bar and a separate "Win
  rate" bar, plus revenue printed as text. Considered and rejected: a
  bubble chart (leads × win-rate × revenue-as-size) — correctly flagged
  during design review as harder to read for a quick daily glance, since
  it requires judging three encoded variables at once including circle
  area, which humans read inaccurately. Bars ask the reader to compare
  exactly one thing (length) at a time.
- **Content attribution (NEW)** — same aggregation shape as source
  performance (lead count, win rate, revenue), grouped by
  `contacts.metadata.landing_page` (blog slug) instead of source. Answers
  "does this specific post produce leads that close?" Stays a table, not
  bars — row count grows with every post published, and a table stays
  legible at higher row counts where bars would get cluttered.
- These two sit side by side (same row) — same tier, comparable height
  at current data volume.

**Section: "Revenue history"**
- **Revenue by month** — unchanged widget, moved to its own section at
  the very bottom. This is a placement choice about daily-glance
  urgency, not a statement that revenue doesn't matter — the headline
  Revenue-MTD figure (with delta) is already in the KPI row up top for
  the daily check; the monthly chart is a weekly/monthly review tool,
  not something requiring daily action, hence lowest position.

## Homepage — new "latest posts" section

Today `src/app/page.tsx` has no blog content at all, just a nav link to
`/blog`. New section inserted after the FAQ section and before the "Ready
when you are" CTA band (content credibility right before the final ask,
consistent with the page's existing rhythm of alternating
`--paper`/`--cream` background sections).

- Pulls the 3 most recent posts via the existing `getAllPosts()` helper
  from `@/lib/blog` (already used by `/blog`'s index) — `.slice(0, 3)`,
  no new data-fetching logic.
- Same card/type conventions as the rest of the page (existing date
  formatting via `formatPostDate`, same hover/link treatment as the blog
  index cards).
- With fewer than 3 posts published (today: 1), renders only that many
  cards — no empty placeholder slots.
- "View all posts →" link to `/blog`.
- No changes to the blog post page's existing end-of-post CTA component.

## Non-goals

- No visual/theme changes anywhere — not marketing site, not blog, not
  other admin pages (Leads/People/Orders/Newsletter unchanged), not the
  digest email.
- No dual-axis charts, no bubble/scatter charts — both explicitly
  considered and rejected during design review for being harder to read
  correctly than the simpler alternatives chosen above.
- No new database tables or migrations — content attribution reads the
  existing `contacts.metadata` jsonb, same as BUILD 3's source capture.
- No campaign-date-range analysis view — if that's needed later, it's
  UTM-field filtering on the existing `/admin/leads` list, not a
  dashboard widget.
- No dark mode.
- Everything stays behind the existing admin login; homepage section is
  public (same as the rest of the homepage).
- All of BUILD 3's original non-goals still apply (no visitor-facing
  email sequences, no page-view tracking, no A/B tests, no lead scoring,
  no customizable-widget dashboards).

## Testing / QA plan

- Leads-vs-Won chart data independently verified against direct Supabase
  queries on `contacts`/`activity_log`, same method BUILD 3's QA used.
- Content-attribution numbers independently verified against
  `contacts.metadata->>'landing_page'` queries.
- Source-performance widget's leads/win-rate/revenue numbers cross-checked
  against the same source data the old Source-quality table used (numbers
  must match exactly — this is a display/layout change, not a logic
  change to the underlying aggregation).
- Needs-attention's in-place actions re-verified after the layout move
  (still write one `activity_log` row per action, still same drawer).
- Homepage section: verify it renders 1 post correctly today (not a
  broken 3-column grid with empty cells), and correctly renders 3 once
  more posts exist (can fake via a temporary local frontmatter file for
  the check, per QA's usual pattern).
- Visual check: confirm every existing color/spacing token used is one
  already defined in `globals.css` — no new hex values introduced.
