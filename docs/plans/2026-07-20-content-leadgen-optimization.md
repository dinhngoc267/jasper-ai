# Content & Lead-Gen Optimization — Decisions & Action List

**Date:** 2026-07-20
**Scope:** Marketing/admin automation (NOT dev team) — reviewed feature-by-feature to boost lead generation.
**Status of this review:** Stopped after the high-leverage 80% (writer + data-driven brain). Remaining features are "keep / blocked / mechanical" — deferred, not decisions that change growth.

---

## Mental model: brain vs engine

The content system is two halves of one machine:

- **The engine** — how posts get *produced & distributed*: `writer-weekly` → `designer-weekly` → `web-publisher-weekly`, plus distribution.
- **The brain** — how we decide *what to write*: `channel-signal.mjs` reads lead/attribution data and proposes the next brief.

```
  channel-signal (BRAIN)          ← data-driven topic selection
        │ proposes brief
        ▼
  brief queue ─→ writer ─→ designer ─→ web-publisher   ← engine
        ▲                                    │ publishes
        │                                    ▼
   attribution DB ◄── leads ◄── LinkedIn push + blog CTA
        └────────── feeds the brain next week ──────────┘
```

Today the loop is broken in two places: **the brain isn't registered**, and **the LinkedIn-push step doesn't exist**.

---

## Key strategic decisions

1. **Explore now, exploit later.** With ~1 real post + seeded data, there are no statistically real "winning" post types. Diversify topics to *learn*; double-down only once real data accrues. (This matches what `channel-signal` already does — it stays evergreen when data is thin.)

2. **"Write more like the winner" = topic clusters, never duplicates.** Same buyer/intent, different angle (e.g. scoping → cost breakdown → proposal red flags → fixed-scope vs T&M). Google penalizes near-identical content.

3. **The DB measures VALUE, not ATTRACTION.** Source capture only fires on a *lead* (contact-form submit), so we can rank posts by leads/revenue but are blind to *readers*. Fixing this needs web analytics (see Phase 1).

4. **Aim at buyers, not browsers.** Bottom-funnel, buying-intent topics ("what does a custom AI agent cost", "AI PoC in 4 weeks", "how to choose an AI vendor") over top-funnel explainers.

5. **Distribution is the missing half.** Top real lead channels are LinkedIn + Referral, but automation only feeds *search* (slow). Highest-leverage change = auto-generate a LinkedIn repurpose draft per post.

---

## Phase 1 — NOW (thin data: run manually, explore)

- [x] **Batch-write 4–6 bottom-funnel briefs** so `writer-weekly` never idles (currently 0 queued). `writer` task. — 5 briefs added 2026-07-20, PR #17.
- [x] **Retarget topics to buying-intent** (pricing, timelines, vendor selection, risk). — same 5 briefs cover cost, timeline, vendor selection (×2), PoC/production risk.
- [ ] **Slow writer cadence to biweekly** — quality + time to distribute > volume. Code-side prep is DONE; the actual cadence edit is a Desktop-only action (see below).
- [x] **Build the LinkedIn-repurpose step** — authored as a new local routine `linkedin-repurpose-weekly` (`website/scripts/E-linkedin-repurpose-routine.SKILL.md`, PR #18). Drafts on the Wed after publish, opens a PR, never auto-posts. **Not yet registered** — Desktop action pending (see below).
- [x] **Add Vercel Analytics** — `@vercel/analytics` installed + mounted in `website/src/app/layout.tsx`, PR #19. Auto-activates on next Vercel deploy, no new env vars.
- [ ] **Register `channel-signal` (brain)** — script + routine file already exist and are committed (`website/scripts/channel-signal.mjs` + `website/scripts/E4.3-content-brief-routine.SKILL.md`). Registration itself is Desktop-only (see below).

### Desktop registration handoff (cannot be done from this CLI session)

Do these in Claude Desktop, using the `create-local-routine` skill, one at a time:

1. **`content-brief-weekly` (the brain)** — register from `website/scripts/E4.3-content-brief-routine.SKILL.md`. Cron `7 19 * * 0` (Sun 7:07 PM). Expect it to report "weak/tie confidence → evergreen positioning" for a while; that's correct at this data volume, not a bug.
2. **`linkedin-repurpose-weekly`** — register from `website/scripts/E-linkedin-repurpose-routine.SKILL.md` (new, this session). Cron `15 9 * * 3` (Wed 9:15 AM, right after `web-publisher-weekly`).
3. **`dashboard-baseline-weekly`** — also still unregistered despite `docs/product/epic-status.md` previously claiming otherwise (corrected 2026-07-20). Re-register from the E4.1 script/routine if the operator wants it live; not in this session's scope but flagged since it was found broken.
4. **`writer-weekly` cadence → biweekly** — edit the existing registered routine's `suggested_cron`/schedule from weekly (`3 9 * * 1`) to a biweekly equivalent (Desktop's scheduler needs an explicit biweekly mechanism — e.g. an every-other-Monday cron via a stored "last run" check, or whatever `create-local-routine` supports for biweekly cadences; confirm the exact mechanism in Desktop since the CLI-side skill doesn't expose it).

After registering, verify with `ls ~/.claude/scheduled-tasks/` and update `docs/product/epic-status.md` / this checklist accordingly — don't just trust past claims (that's exactly the bug found and corrected this session).

## Phase 2 — LATER (real data: ~5–10 posts + weeks of leads)

- [ ] Channel-signal detects real winners → auto-proposes briefs biased to what converts.
- [ ] Shift writer from *explore* (diversify) to *exploit* (topic clusters around winners).
- [ ] Full-funnel ROI visible: readers/post (analytics) → leads/post (DB) → revenue/post (DB).

---

## Data-integrity fixes (found during review)

- [x] `docs/product/epic-status.md` claims E4.1 `dashboard-baseline-weekly` is registered ("next run 2026-07-20") and E4.3 pending — **neither is in `~/.claude/scheduled-tasks/`.** Reconciled 2026-07-20, PR #20.
- [ ] Content-attribution widget currently shows **seed data** (fictional companies, tagged `attributes.source = "seed:content-attribution"`). Remove before trusting real numbers.
- Note: an existing `website/scripts/seed-demo-leads.mjs` already exists (the ad-hoc seed script this session was redundant).

---

## Not yet reviewed (deferred — low decision-value)

- `designer-weekly` — mechanical; blocked on Gemini/GCP billing anyway.
- `web-publisher-weekly` — mechanical (markdown → Next.js page, commits, human pushes).
- **Capture group** (contact form, source capture, blog CTA) — all live, verdict "keep".
- **Nurture group** (daily digest ✅ live; needs-attention ✅ live; newsletter draft-only; visitor email 🔴 blocked on `jasper-ai.com`).
- **Admin/PM routines** — open question: do daily standup/EOD/RAG earn their keep for a solo operator?

---

## Registration note

Local routine registration (`channel-signal`, cadence changes) must happen in **Claude Desktop**, not the VS Code session. Prep here, register there.
