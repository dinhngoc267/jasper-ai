# Jasper AI — Project Context

## Business
- **Name:** Jasper AI
- **Operator:** Jasper Le (jasper.le@edge8.ai) · GitHub `dinhngoc267`
- **What we sell:** Fixed-scope AI development projects (AI agents, RAG systems,
  knowledge graph solutions, custom LLM applications), AI consulting (use-case
  evaluation, architecture design, implementation planning), and ongoing monthly
  support & development retainers.
- **Tagline:** AI systems that ship.
- **Domain:** none yet — live at https://jasper-ai.vercel.app (buy jasper-ai.com before email features)
- **Design direction:** Minimalist Apple — clean, generous white space, calm, premium.

## Stack
- Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui) in `website/`
- Supabase (data, auth, subscribers) — project `jasper-ai`
- Vercel (hosting; deploys ONLY via `git push` → CI/CD)
- Resend (email — blocked until a real domain is bought and verified)

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

## Content queue
- Writer drafts to `content/topics/{slug}/brief.md` → `blog.md`
- Designer adds visuals after copy approval
- Web Publisher builds pages, commits locally — operator runs `git push`

## Automated pipeline (registered in Phase 2, Prompt 10)
- Weekdays 7am — PM daily plan · 6pm standup compile · 6:30pm EOD summary
- Mon 9am Writer · Tue 9am Designer · Wed 9am Web Publisher · Thu 10am Email Marketer
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
