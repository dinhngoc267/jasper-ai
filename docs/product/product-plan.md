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
