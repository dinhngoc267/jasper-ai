# Jasper AI — Project Context

## Business
- **Name:** Jasper AI
- **Operator:** Jasper Le (jasper.le@edge8.ai) · GitHub `dinhngoc267`
- **What we sell:** Fixed-scope AI development projects (AI agents, RAG systems,
  knowledge graph solutions, custom LLM applications), AI consulting (use-case
  evaluation, architecture design, implementation planning), and ongoing monthly
  support & development retainers.
- **Tagline:** AI systems that ship.
- **Domain:** none yet — live at https://jasper-ai-neon.vercel.app (buy jasper-ai.com before email features; the plain jasper-ai.vercel.app alias was taken)
- **Design direction:** Minimalist Apple — clean, generous white space, calm, premium.

## Stack
- Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui) in `website/`
- Supabase (data, auth, subscribers) — project `jasper-ai`
- Vercel (hosting; deploys ONLY via `git push` → CI/CD)
- Resend (email — visitor-facing email blocked until a real domain is bought
  and verified; internal digest email to jasper.le@edge8.ai works today in
  sandbox mode, no domain dependency)

## Build status
- **Build 1 — Prove the loop:** ✅ (verified live 2026-07-14)
  - Contact form on the live site upserts a `People` row (by email) + linked
    `Contacts` row, landing in `new_lead` status: ✅
  - Custom attributes (`how_they_heard`, `company_size`, `estimated_budget`)
    saved in the `attributes` jsonb: ✅
  - `/admin` gated behind Supabase Auth (email/password, seeded
    `jasper.le@edge8.ai`): ✅
  - Admin leads view (Kanban board + per-lead drawer), newest-first: ✅
  - Schema: `website/supabase/migrations/0001_build1_people_contacts.sql`
- **Build 2 — Run the business from /admin:** ✅ (People, Contacts pipeline,
  Orders, Newsletter all live behind login)
  - `activity_log` table + `updateLeadStatus` action driving the Kanban
    board (migration `0002`): ✅
  - Orders table + admin Orders page (lookup-by-email, record purchase,
    newest-first) (migration `0003`): ✅
  - People directory: searchable by name/email/company, per-person drawer
    with full history: ✅
  - Newsletter page: everyone with `ok_to_contact = true`: ✅
  - `/admin` restructured into a `(dashboard)` route group with shared
    nav/logout: ✅
  - Resend wired: best-effort internal notification to jasper.le@edge8.ai on
    every submit (non-blocking, sandbox mode): ✅
  - Detail + open follow-ups tracked in `docs/product/epic-status.md` (E2)
- **Build 3 — The dashboard works the pipeline for me:** ✅
  - Funnel diagnostics (stage-to-stage conversion, median time-in-stage,
    source-quality table): ✅
  - Actionable needs-attention list (status change, note, mark followed up
    in place, each writing an activity_log row): ✅
  - Source capture live (first-touch UTM/referrer/landing page into
    `contacts.metadata`, shown in the lead drawer): ✅
  - Daily digest cron live (Vercel Cron weekdays 15:00 UTC / 8am PDT via
    `website/vercel.json` → `website/src/app/api/cron/digest/route.tsx`,
    React Email, internal-only to jasper.le@edge8.ai): ✅
  - Blog end-of-post CTA (shared component, slug carried into source data): ✅
  - QA-REPORT: `docs/engineering/changes/2026-07/2026-07-17-build3-pipeline-dashboard/QA-REPORT.md`

## Folder structure
```
jasper-ai/
├── CLAUDE.md               ← you are here
├── agents/<8 roles>/{context,skills}
├── content/{topics,content-calendar}
├── docs/
│   ├── architecture/{templates,workflows}
│   ├── brand/              ← design system (style-guide.md) — read BEFORE building UI
│   ├── engineering/changes/YYYY-MM/YYYY-MM-DD-{task-slug}/  ← TECH-PLAN, EXEC-PLAN, CHANGELOG, QA-REPORT
│   ├── product/            ← product.md, epics.md, epic-status.md
│   └── {qa,features,archive,plans}
├── emails/drafts
├── standup/{individual,briefings}
├── website/                ← the Next.js app (deployed root on Vercel)
└── working_files/          ← scratch, never committed
```

## Next.js 16 conventions
- This is Next.js 16 — APIs may differ from training data. Read
  `website/node_modules/next/dist/docs/` before writing unfamiliar code.
- Server Components by default; `"use client"` only when required.
- `proxy.ts`, not `middleware.ts`.
- Server Actions for mutations (contact form uses `useActionState`).

## Engineering rules (summary — full rules in ~/.claude/rules/global-engineering.md)
- `git status` before any file work; stage files by name (never `git add .`)
- No commits unless explicitly instructed; no force-push; no `--no-verify`
- Deploys via `git push` only — NEVER `vercel deploy` / `vercel --prod`
- Secrets live in `website/.env.local` (gitignored) and Vercel env vars — never in code
- Email campaigns ALWAYS need human approval before sending

## Content queue (Supabase `posts` table — no git PRs)
As of the 2026-07-20 content-pipeline-to-supabase change, content lives in the
Supabase `posts` table and is reviewed in `/admin/content`, not via git files +
PRs. A content item is a blog post: `title` + `body_markdown` (rendered by
`website/src/lib/blog.ts`), plus blog settings (`description`, `tags`,
`target_keyword`, `hero_image_url`, LinkedIn). Blog rendering is DB-driven, so
publishing is a status flip with no deploy. Lifecycle is one gate:
`pending_review → published` (`rejected` is terminal).
- **writer-weekly** reads the channel signal and writes ONE COMPLETE post
  (title + full body + SEO/tags) straight to `pending_review`
  (`website/scripts/posts-cli.mjs create-post`). No separate brief step.
- Operator reviews the finished post in `/admin/content` and clicks **Publish**
  (→ `published`, live immediately; no `.jsx`, no image commit, no PR, no
  deploy) or **Reject**.
- **designer-weekly** (blocked on billing) will write `hero_image_url`.
- **linkedin-repurpose-weekly** writes `linkedin_draft` + `linkedin_status =
  pending_review` onto a published post (`posts-cli.mjs save-linkedin`).
- Every write into a review state emails the operator a link to
  `/admin/content/{id}` (`website/scripts/notify-review-needed.mjs`).
- **Retired:** `content-brief-weekly` (folded into writer-weekly) and
  `web-publisher-weekly` (publishing is the operator's click). See the
  `*.RETIRED.md` notes in `website/scripts/`.

## Automated pipeline (registered in Phase 2, Prompt 10)
- Weekdays 7am — PM daily plan · 6pm standup compile · 6:30pm EOD summary
- Mon 9am Writer (full post) · Tue 9am Designer · Wed 9:15am LinkedIn repurpose
  · Thu 10am Email Marketer (content-brief + Web Publisher retired)
- Fri 5pm — PM weekly RAG report

<!-- BEGIN: AGENT-DELEGATION (managed by infiniteleverage skills — do not delete this block) -->
## Agent delegation (auto-routing)

When you receive a request, **delegate to the right specialist agent** before doing the work yourself. The 8 agents and their triggers:

| Agent | Delegate when the request involves… |
|---|---|
| **product-manager** | roadmap, vision, epics, daily plan, project-status.html, scope changes, approval triage, stakeholder updates, standup briefings |
| **developer** | writing/changing code, fixing bugs, refactoring, scaffolding pages, API endpoints, Supabase migrations, env-vars wiring |
| **qa** | testing, regression checks, browser matrix, accessibility, QA plans, "verify this works" |
| **devops** | CI/CD, deployments, secret management, infra escalations, Vercel/GitHub workflow issues |
| **designer** | UI mockups, brand application, image prompts, design system updates, visual reviews |
| **writer** | blog drafts, social copy, SEO briefs, voice/tone, content briefs |
| **web-publisher** | publishing markdown → Next.js components, updating `website/pages/blog/index.jsx`, image optimization, the publish workflow |
| **email-marketer** | email drafts, sequences, broadcast campaigns, Brevo/Resend, CRM segmentation |

**Delegation rules:**
1. Pick exactly **one** agent per turn — don't run two in parallel unless the operator explicitly says so.
2. If a request spans agents (e.g., "write a blog *and* publish it"), call them **in sequence**: writer → designer → web-publisher.
3. If unclear which agent fits, **ask the operator** before assuming.
4. Cross-cutting engineering rules live in `.claude/rules/global-engineering.md` — every agent honors them.
5. Project-level persona overrides for each agent live in `agents/<name>/context/persona.md` — read these on first invocation.
6. Trigger phrases: `@product-manager`, `@developer`, etc. — but auto-route even without the `@` when intent is clear.
<!-- END: AGENT-DELEGATION -->
