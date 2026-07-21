# Admin Dashboard — Overview + Analytics

## Context

`/admin` currently has no dashboard: the root route (`website/src/app/admin/(dashboard)/page.tsx`) is the Leads Kanban board itself, alongside Orders, People, and Newsletter pages. The course requires adding a dashboard to the admin site. Brainstormed with the operator (Jasper) on whether to build a fixed-layout dashboard with live data vs. a fully customizable/dynamic widget dashboard.

Decision: **fixed layout, live Supabase data, richer analytics** (approach #2 of 3 discussed). A drag-and-drop/customizable widget builder was explicitly rejected as disproportionate engineering effort for a single-operator internal tool — the "fancy" that pays off here is real numbers, trend indicators, and clean charts in the project's existing Apple-minimalist style, not a configuration surface.

## Scope

### 1. Information architecture
- Move the existing Leads Kanban board from `/admin` (root) to `/admin/leads`.
- New Dashboard becomes the `/admin` root — first screen after login.
- Nav order (`nav-links.tsx`): Dashboard, Leads, Orders, People, Newsletter.

### 2. KPI row (top of page)
Four cards, each with a trend indicator vs. the prior comparable period:
- **New leads this week** — `contacts` created in last 7 days vs. prior 7.
- **Open pipeline count** — `contacts` where `status` not in (`won`, `lost`).
- **Revenue this month** — sum of `orders.amount_cents` where `status = 'paid'`, current calendar month vs. last.
- **Newsletter subscribers** — `people` where `ok_to_contact = true`, total + this-week delta.

### 3. Charts
- **Leads over time** — line/area chart, daily count of new `contacts`, last 30 days.
- **Conversion funnel** — `new_lead → contacted → discovery_call → proposal → won`, counting contacts by furthest stage reached (derive from current `status`, cross-checked against `activity_log` history so a contact isn't double-counted at an earlier stage it already passed through).
- **Revenue by month** — bar chart, last 6 months, summed `paid` orders per month.

### 3a. Interactivity — period toggle
A single segmented control (Week / Month / Quarter) that changes the aggregation window for the "leads over time" and "revenue" charts — e.g. Week = daily points over 7 days, Month = daily points over 30 days, Quarter = weekly points over ~13 weeks. This is a lightweight, contained addition — not a config system: one client component driving a re-fetch (via `searchParams` or client state), no saved preference, no per-widget customization. Open question to resolve during prototyping: does the toggle apply to just these two charts, or does it also reshape the KPI row's comparison period (e.g. "vs last week" becomes "vs last month" when Month is selected)? Prototype both states before deciding.

### 4. Needs-attention list
Table below the charts: leads in a non-terminal status with no `activity_log` entry in the last 7 days (fallback to `contacts.created_at` if `activity_log` has no rows for that contact, matching the existing staleness-fallback pattern already used in the Kanban board). Each row links into the lead drawer on `/admin/leads`.

### 5. Data approach
- All server-side in one `page.tsx`, following the existing pattern in the current dashboard page (`Promise.all` over a handful of Supabase queries via `getSupabaseAdmin()`, `dynamic = "force-dynamic"`, graceful fallback to empty/zero states rather than throwing — same style as `fetchLeads`/`fetchActivityLog` in the current `page.tsx`).
- No new tables — everything derives from existing `people`, `contacts`, `activity_log`, `orders` (migrations `0001`–`0003`).
- Reuse existing types/helpers in `src/lib/leads.ts`, `src/lib/orders.ts`, `src/lib/people.ts` where they already model these rows; add query helpers alongside them rather than inline in the page.
- Charts: check `website/package.json` for an existing charting library (Recharts is the common shadcn/ui pairing) before adding a new dependency. Style per the `dataviz` skill and this project's brand (`docs/brand/style-guide.md`).

### 6. Non-goals (explicit)
No drag-and-drop customization, no widget picker, no saved per-admin layout, no arbitrary/custom date-range picker (only the fixed Week / Month / Quarter toggle above), no export/PDF.

## Prototyping step (before implementation)

Before the developer agent builds this, hand this plan + `docs/product/product-plan.md` + `docs/brand/style-guide.md` to a prototyping session (e.g. via the `designer` agent or a separate Claude Design session) to mock up:
- The KPI row, charts, and needs-attention list in the Apple-minimalist style.
- The Week / Month / Quarter toggle's placement and interaction, and both states it produces (chart-only vs. chart+KPI reflow) so that open question above gets resolved visually before code is written.

Once the prototype is reviewed, update this plan with the resolved toggle-scope decision, then proceed to implementation.

## Dependency to resolve before/during implementation

Per `docs/product/epic-status.md` and root `CLAUDE.md`'s catalog: migrations `0002` (`activity_log`) and `0003` (`orders`) are listed as **not yet confirmed applied to the production Supabase project**. The funnel and revenue widgets need both tables populated with real data to be meaningful. Confirm migration status (e.g. via `mcp__supabase__list_migrations`) before/at the start of implementation, and apply if missing.

## Files likely touched

- `website/src/app/admin/(dashboard)/page.tsx` — becomes the new Dashboard (KPIs, charts, needs-attention).
- New route `website/src/app/admin/(dashboard)/leads/page.tsx` — houses the existing Kanban board (move `leads-board.tsx`, `lead-drawer.tsx`, `kv.tsx` usage here; the fetch logic currently in `page.tsx` moves with it).
- `website/src/app/admin/(dashboard)/nav-links.tsx` — add "Dashboard" nav entry, update "Leads" link target to `/admin/leads`.
- New component(s) for KPI cards, charts, and the needs-attention table (co-located under `(dashboard)/`, following the existing flat-file convention seen in `leads-board.tsx`, `people-directory.tsx`).
- Possibly `src/lib/leads.ts` / a new `src/lib/dashboard.ts` for the aggregate queries (weekly counts, funnel counts, monthly revenue).

## Verification

- `npm run build` / `npm run dev` in `website/` — confirm the dashboard renders with real data against the connected Supabase project, and the moved Leads board still works at `/admin/leads`.
- Manually check each KPI number and chart against a direct Supabase query (e.g. via `mcp__supabase__execute_sql`) to confirm correctness — especially the funnel's "furthest stage reached" logic and the needs-attention staleness fallback.
- Confirm `/admin` root, `/admin/leads`, `/admin/orders`, `/admin/people`, `/admin/newsletter` are all still gated behind login (no regression to the auth proxy).
- Update `docs/product/epic-status.md` and `CLAUDE.md`'s catalog once shipped, per the existing project convention.
