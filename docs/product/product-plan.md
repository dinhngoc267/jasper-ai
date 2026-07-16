# Product plan · Jasper AI

## What we're actually building and why

In one sentence: Every inquiry for AI development, consulting, or retainer
work lands in one pipeline that I work from first contact to won or lost —
so no opportunity ever again depends on my inbox and my memory, which is
exactly where leads would slip today.

Who it's for: Me as the operator — an AI engineer launching a consulting
and custom AI development practice — and the people who reach out: founders
and teams who want AI agents, RAG systems, knowledge graph solutions, or
custom LLM applications built; businesses who want AI strategy and
architecture advice; and clients who want ongoing monthly support.

What we are deliberately NOT building: no affiliates, no subscriptions,
no cohorts, no integrations beyond what's named here. If it isn't
load-bearing for capturing and working a lead, it's out.

> **Scope change (2026-07-16):** This list originally read "no analytics
> dashboards." An admin dashboard shipped ad hoc on 2026-07-15 (commit
> `bdfff3d`, tracked as epic E3) before that exclusion was revisited. BUILD 3
> formally amends the exclusion: the dashboard is adopted as the one
> instrument I run lead generation from, so "no analytics dashboards" is
> lifted — but narrowly. The dashboard is load-bearing for exactly one job:
> deciding, each week, where lead-generation effort goes. It is not a licence
> to build reporting for its own sake. See BUILD 3 for the hard limits.

## The brief (drives every /goal command)

You are my engineering partner for building my CRM today. Build a
Next.js (App Router) + Supabase + Vercel app with two surfaces:
a public marketing site that captures leads, and an /admin CRM.
The /admin section is open and unprotected at first; it gets locked
down with email-and-password Supabase Auth later in the build. Do
not add any auth, login page, or route protection until I explicitly
ask for it.

The CRM has exactly four parts:

- People: a contact directory, one row per person, deduplicated by
  email. Columns: id, email (unique), name, phone, company, role,
  source_site, ok_to_contact, attributes (jsonb), created_at,
  updated_at. The custom attributes I named go inside attributes.
  The keys are my attribute names and the values match the types I
  specified.

- Contacts: an inquiry pipeline. Each inquiry links to a person and
  moves through stages new_lead, contacted, discovery_call,
  proposal, won, lost. Columns: id, person_id, type, subject,
  message, source, status, metadata (jsonb), created_at. The type
  field is constrained to exactly the inquiry types I gave in Q4
  (lowercased).

- activity_log: every status change on a Contacts row writes one row
  here. Columns: id, contact_id, person_id, from_status, to_status,
  actor, note, created_at.

- Orders: what people bought. Columns: id, person_id, product_name,
  amount_cents, currency, status (pending, paid, refunded,
  cancelled), created_at.

- Newsletter: people who opted in to email, tracked by
  people.ok_to_contact = true. No separate table.

Conventions:
- Upsert people by email; never duplicate a person.
- Access Supabase server-side with the service key; never expose
  secrets to the client; keys live in environment variables only.
- Keep it simple: no affiliates, no subscriptions, no cohorts.
- Work one step at a time and wait for my approval before each step.

My business: Jasper AI — fixed-scope AI development projects (AI agents,
RAG systems, knowledge graph solutions, custom LLM applications), AI
consulting (use-case evaluation, AI architecture design, implementation
planning), and ongoing monthly support and development retainers.
My inquiry types (contacts.type enum): ai_development_project,
ai_consulting, ongoing_support, general_inquiry
My design system: Minimalist Apple
My brand colors: use the design system defaults (no brand colors yet)
My custom attributes (people.attributes jsonb keys):
- how_they_heard — short typed note (e.g. LinkedIn, referral, GitHub,
  personal website)
- company_size — pick-from-a-list: Solo, Startup (2–10), Small Business
  (11–50), Medium Business (51–250), Enterprise (250+)
- estimated_budget — pick-from-a-list: Under $5k, $5k–$20k, $20k–$50k,
  Over $50k
My domain: jasper-ai.com

## BUILD 1 — Prove the loop

Goal: A stranger can submit an inquiry on my live site and I can see
that lead inside /admin, on the same day, without anyone touching the
database by hand. This closes the exact gap I named in Q1 — today an
inquiry would live in LinkedIn or email and survive only as long as my
memory does. It is the smallest thing that proves the whole system works
end to end. Nothing else matters until this is real.

Scope: the People and Contacts tables with my custom attributes
(how_they_heard, company_size, estimated_budget) wired into the jsonb
column; a working contact form on the live marketing site that writes a
People row (upserted by email) and a linked Contacts row; one admin login
with a single verified account; one admin page that lists incoming leads
newest first.

Definition of Done (every box must be true):
- The contact form is live on jasper-ai.com, not localhost.
- Submitting it creates exactly one People row and one linked Contacts
  row, deduplicated by email on repeat submits.
- how_they_heard, company_size, and estimated_budget are saved correctly
  inside attributes.
- A new Contacts row lands in status new_lead.
- I can log in to /admin with my one seeded account.
- The admin leads page shows the submission within seconds, newest first.
- I personally run the full flow once: submit as a visitor, log in, see it.

Success Criteria (how we know it's good, not just done):
- From a cold start, I can go submit to visible in under 60 seconds.
- Two submissions from the same email produce one person, not two.
- I can read the lead's name, type, message, and my custom attributes
  on the admin page without opening Supabase.
- No lead can land and go unseen — the inbox-and-memory failure mode I
  named in Q1 is structurally impossible for anything submitted through
  the site.

## BUILD 2 — Make it the system I run the business from

Goal: Turn the proven loop into the place I actually manage relationships
and money. After this, I work leads, record what people bought, and keep
my newsletter list entirely from /admin behind my login, and every new
lead gets an automatic confirmation email. This is what makes my Q2
ninety-day win achievable: every inquiry captured automatically, every
follow-up managed from the pipeline instead of memory, in real daily use
at 3–5 inquiries a week and ready for more.

Scope: the rest of the /admin back end behind my login: the full People
directory, all inquiries with working pipeline stages, the Orders list,
and the Newsletter list (ok_to_contact = true). Plus Resend wired so a
confirmation email fires on form submit. Every Contacts status change
writes an activity_log row.

Definition of Done (every box must be true):
- All four parts (People, Contacts, Orders, Newsletter) are visible and
  usable in /admin, and all of /admin sits behind my login.
- I can move a Contacts row through new_lead to contacted to
  discovery_call to proposal to won or lost from the interface.
- Each status change writes one activity_log row with from_status,
  to_status, and actor.
- The People directory is searchable and shows how_they_heard,
  company_size, and estimated_budget.
- I can add an Orders row against a person and see it on their record.
- The Newsletter list shows everyone with ok_to_contact = true.
- Resend is connected, jasper-ai.com is verified as the sending domain,
  and a real confirmation email arrives after a form submit.

Success Criteria (how we know it's good, not just done):
- I can run a lead from first inquiry to won without leaving /admin or
  touching the database.
- A person's full history (their inquiries, status changes, and orders)
  is visible in one place.
- A test submission produces a confirmation email in the inbox, not spam,
  with jasper-ai.com as the sender.
- Nothing in /admin is reachable without logging in.
- At 3–5 inquiries a week — my real starting volume from Q2 — this keeps
  up without me dropping to the database by hand, and nothing about the
  design breaks when that number grows.

## BUILD 3 — Leverage the dashboard to grow lead generation

Goal: Turn the dashboard from a display I glance at into the instrument I
run lead generation with. Builds 1 and 2 catch and work leads reactively —
they wait for the inbox to fill. BUILD 3 closes the loop the other way with a
real automated pipeline, not a personal ritual: scheduled jobs compute the
funnel baseline and bias content toward the channel that's working, while the
dashboard itself is made impossible to ignore for stale leads. The one thing
that stays permanently human is deciding what to actually change about a
leaking stage — the system flags, it never fixes.

> **Revision (2026-07-16):** the original version of this section described a
> manual weekly ritual where I personally review the dashboard and make three
> decisions by hand, with no new code beyond the E3 bug fix. After working
> through the mechanics, that's been replaced with three separately-scoped,
> automated pieces below — each with its own readiness state, rather than one
> undifferentiated weekly chore.

Scope: E3's dashboard verification is still the hard entry gate — nothing
below starts until the KPI totals, conversion-funnel "furthest stage reached"
logic, revenue-by-month math, how-they-heard breakdown, and needs-attention
staleness logic are confirmed against direct Supabase queries and a
QA-REPORT is filed. Once that passes, BUILD 3 is three pieces:

1. **Weekly baseline + funnel-leak flag.** A scheduled job computes
   inquiries/week and per-stage conversion rates, and flags whichever
   pipeline stage has the largest stage-to-stage drop-off. (Real data in this
   project today: new_lead→contacted 33%, contacted→discovery_call 33%,
   discovery_call→proposal 25%, proposal→won 33% — fairly even right now,
   no single glaring leak yet, which is itself a useful early finding rather
   than a null result.) Results are written to a durable weekly log. No
   external dependency, no blocker — buildable as soon as E3 passes.
   **The system flags the leaking stage; it does not and cannot fix it.**
   Deciding and making the process fix for a leaking stage is a permanent
   human judgment call, never something to automate away.
2. **Needs-attention visibility.** The dashboard's stale-lead list (≥7 days
   idle) is made impossible to miss directly on the dashboard UI, rather than
   pushed out as an external notification. No new integration required — it
   reuses the existing Supabase-backed dashboard. A Lark/Slack-style push
   notification was considered and set aside for now because `LARK_*` env
   vars are blank in this project (per the `CLAUDE.md` catalog) — that
   remains a separate future option, not this build's scope. No blocker
   beyond E3 — ships alongside item 1.
3. **Channel-biased content briefs.** A scheduled job reads the
   how-they-heard breakdown and biases the next content brief toward
   whichever channel is producing leads, feeding the existing
   Mon(writer)/Tue(designer)/Wed(web-publisher) weekly content schedule. This
   piece publishes to the project's own website — a new `/blog` section at
   `website/src/app/blog/...` (Next.js App Router; NOT
   `website/pages/blog/...`, the old Pages Router path the web-publisher
   agent's default persona incorrectly assumed for this project, already
   corrected today in `agents/web-publisher/context/persona.md`). It is NOT
   an email channel — email/newsletter is a fully separate concern, already
   blocked on the `jasper-ai.com` domain purchase and Resend domain
   verification. **Hard blocker, sequenced ahead of this piece:** the
   writer → designer → web-publisher content pipeline has never run once in
   this project — `content/topics/` is empty, no brief has ever been
   written, and there is no `/blog` route on the live site yet.
   Channel-bias automation cannot be layered onto a pipeline that's never
   been proven end to end. A precursor task — one real post taken brief →
   written → designed → published live, run manually/on-demand rather than
   on data-driven autopilot — must happen first, to establish the actual
   blog page conventions. Only after that proof does automating the
   channel-selection step make sense. Automation for this piece stops at a
   staged git commit: per this project's engineering rules (deploys only via
   `git push`, never a direct push to `main`, no `vercel deploy`), the
   actual go-live push is always a human action, stated explicitly here so
   it isn't read as a gap later.

Deliberately NOT in scope: email nurture of any kind — newsletter sends,
sequences, the visitor confirmation email — which stays blocked until
jasper-ai.com is purchased and verified as a Resend sending domain (both
still open in the CLAUDE.md catalog); paid acquisition; and any new dashboard
feature beyond what items 1–2 above and the E3 verification step force us to
build. This build also formally amends the "no analytics dashboards"
exclusion recorded at the top of this plan.

**Decided (2026-07-16):** the weekly baseline log lives in a new
`docs/product/dashboard-baselines/` folder, one file per week.

Definition of Done (every box must be true):
- E3's dashboard verification passes (KPI totals, funnel "furthest stage
  reached" logic, revenue-by-month math, how-they-heard breakdown,
  needs-attention staleness logic all match direct Supabase queries) and a
  QA-REPORT is filed — the entry gate for everything below.
- Item 1 (weekly baseline + funnel-leak flag) runs on schedule and writes a
  durable weekly log at a decided location; the flagged leaking stage is
  visible but never auto-resolved — the fix remains a human decision.
- Item 2 (needs-attention visibility) makes every stale lead (≥7 days idle)
  impossible to miss on the dashboard UI itself, with no reliance on an
  external notification channel.
- Item 3's precursor — one real post shipped brief → written → designed →
  published live on the new `/blog` route — is complete before any
  channel-bias automation is built on top of it.
- Once the precursor is proven, item 3's scheduled job reads the
  how-they-heard breakdown and biases the next content brief toward the
  producing channel, staging a git commit for human review — never pushing
  to `main` itself.

Success Criteria (how we know it's good, not just done):
- I can answer "which channel produces leads, and where do they stall?" from
  the dashboard in under a minute — and trust the numbers because they were
  verified.
- No lead has sat stale past 7 days without it being visually obvious on the
  dashboard the moment I open it.
- Every content post shipped through the automated path traces back to a
  how-they-heard number that justified targeting that channel — no content
  ships on a hunch — and every go-live push was a deliberate human action,
  not something the automation did on its own.
- The funnel-leak flag surfaces a real leaking stage (or confirms, as today's
  data does, that no single stage is glaring yet) without ever silently
  "fixing" it — that decision stays mine.

> **Operator-tunable choices:** the 7-day staleness threshold is Jasper's
> call, not fixed law. Adjust it if real volume argues for it — e.g. tighten
> to 5 days if leads move faster — and note the change here when you do.
