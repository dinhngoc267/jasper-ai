-- ============================================================================
-- Migration 0003 — Build 2: orders
-- ----------------------------------------------------------------------------
-- Purpose: what people bought. One row per purchase, linked to a person, so
-- the operator can record and see orders against a person's record from the
-- admin Orders page and the People directory.
--
-- Scope note: this is Build 2 only. Written from the admin Orders form via
-- a lookup-by-email against an existing `people` row (never creates one).
--
-- Security model (IMPORTANT):
--   Row Level Security is ENABLED with NO policies — same pattern as 0001's
--   `people`/`contacts` and 0002's `activity_log`. With RLS on and no
--   policies, the public/anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) can read
--   and write NOTHING in this table. All application access happens
--   server-side using the service-role key, which bypasses RLS entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- orders — one row per purchase, linked to a person.
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people (id) on delete cascade,
  product_name   text not null,
  amount_cents   integer not null,
  currency       text not null default 'usd',
  status         text not null default 'pending' check (
                   status in ('pending', 'paid', 'refunded', 'cancelled')
                 ),
  created_at     timestamptz not null default now()
);

-- Orders admin page lists newest first; the person record joins on person_id.
create index if not exists orders_created_at_desc_idx
  on public.orders (created_at desc);
create index if not exists orders_person_id_idx
  on public.orders (person_id);

-- ----------------------------------------------------------------------------
-- Row Level Security: enabled, NO policies. See the security note at the top —
-- anon key gets zero access; the server's service-role key bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;

comment on table public.orders is
  'What people bought, linked to people. RLS enabled with no policies: anon key has no access; server uses the service-role key which bypasses RLS.';
