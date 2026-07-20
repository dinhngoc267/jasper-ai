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
no cohorts, no analytics dashboards, no integrations beyond what's named
here. If it isn't load-bearing for capturing and working a lead, it's out.

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

## BUILD 3 — The dashboard works the pipeline for me

Goal: Turn the read-only dashboard shipped in E3 into the thing that
actively improves my funnel. After this, the dashboard tells me where
leads die and how long each stage takes, lets me work a stale lead
without leaving it, records where every lead truly came from (down to
the individual blog post), nudges me by email every weekday morning
before anything goes cold, and every blog post ends with a clear path
to the contact form. The failure mode this kills: leads decaying
silently in the pipeline while I look at charts that only describe
the decay.

Scope — five parts:

1. Funnel diagnostics. Upgrade the existing conversion funnel from raw
   counts to stage-to-stage conversion rates (of leads that reached
   contacted, what % reached discovery_call, then proposal, then won),
   computed from activity_log history. Add median time-in-stage per
   stage. Add a source-quality table: per source — lead count, win
   rate, revenue — combining self-reported how_they_heard with the
   captured true source from part 3.

2. Actionable needs-attention list. Every row in the dashboard's
   needs-attention list becomes workable in place: open the existing
   lead drawer, change status, add a note, or "mark followed up".
   Every action writes an activity_log row — that row is what resets
   the staleness clock, so follow-up actions and the nudge system in
   part 4 share one source of truth. Reuse the existing lead drawer
   and updateLeadStatus pattern; no new tables.

3. Source capture (silent instrumentation). The contact form captures
   utm_source, utm_medium, utm_campaign, referrer, and first-touch
   landing page into contacts.metadata (existing jsonb — no
   migration). First-touch means captured when the visitor first
   arrives and persisted client-side (e.g. sessionStorage) through to
   submit — reading the referrer at submit time would only ever say
   "came from /contact". The lead drawer shows the true source next
   to the self-reported how_they_heard.

4. Internal daily digest — a morning pulse email, not a plain list.
   A Vercel Cron job sends one email each weekday morning via Resend
   to jasper.le@edge8.ai, built with React Email: a mini KPI row (new
   leads this week, open pipeline, revenue this month, each with a
   delta vs. the prior period), a compact CSS-rendered funnel with
   per-stage counts and conversion rates, and every stale lead
   grouped by urgency with colored badges and deep links into
   /admin/leads. Visuals are CSS/table-based so the email renders
   correctly in every client with remote images blocked; styling
   matches the Apple-minimalist design system. Staleness thresholds
   per stage (tunable defaults): new_lead untouched > 2 days,
   contacted > 4 days, discovery_call or proposal > 7 days.
   "Untouched" = no activity_log row since. Internal-only — no
   visitor-facing email, so no domain dependency.

5. Blog end-of-post CTA. One shared component appended to every blog
   post ("Scoping an AI project? Let's talk" → contact form), with
   the post slug carried into the form's source data so blog
   attribution works even when the referrer header is stripped.

Deliberately NOT in this build: visitor-facing email sequences
(blocked on the jasper-ai.com domain purchase), per-person page-view
or reading-history tracking (disproportionate at current volume —
revisit alongside Resend email-click tracking in the future email
build), A/B tests or CTA experiments on the marketing site,
customizable-widget dashboards (already rejected), lead scoring.

Definition of Done (every box must be true):
- The dashboard funnel shows stage-to-stage conversion rates and
  median time-in-stage, derived from activity_log, and the numbers
  match direct Supabase queries.
- A source-quality table on the dashboard shows lead count, win rate,
  and revenue per source.
- From the needs-attention list I can change a lead's status, add a
  note, and mark it followed up without navigating away, and each
  action writes an activity_log row.
- A form submit that started on a blog post stores that post as the
  first-touch landing page in contacts.metadata, along with referrer
  and any UTM parameters, and the lead drawer displays them.
- Every published blog post ends with the shared CTA block linking to
  the contact form with the post slug attached.
- A weekday-morning digest email arrives at jasper.le@edge8.ai
  showing the KPI row with deltas, the mini funnel with conversion
  rates, and stale leads grouped by urgency with working deep links —
  and it reads correctly with remote images blocked. A lead acted on
  today does not appear in tomorrow's digest.
- All of it sits behind the existing login; nothing new is reachable
  logged out.

Success Criteria (how we know it's good, not just done):
- I can answer "which stage loses the most leads and how long do
  leads sit there?" from the dashboard alone, without SQL.
- I can answer "does the blog produce leads, and do they close?" per
  post, from the source-quality table.
- A stale lead goes from digest email to acted-on in under a minute:
  click the deep link, work it from the needs-attention list, done.
- Following up on a lead today provably removes it from tomorrow's
  digest — the staleness clock and my actions agree.
- No lead can silently decay: anything untouched past its threshold
  appears in both the dashboard and the next morning's email.
