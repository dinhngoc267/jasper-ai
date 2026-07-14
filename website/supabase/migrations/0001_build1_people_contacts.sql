-- ============================================================================
-- Migration 0001 — Build 1: People + Contacts
-- ----------------------------------------------------------------------------
-- Purpose: the data layer that turns the marketing contact form into real
-- captured leads. Creates exactly two tables:
--   people   — one row per person, deduplicated by email (the contact directory)
--   contacts — one row per inquiry, linked to a person (the lead pipeline)
--
-- Scope note: activity_log and orders are Build 2 — deliberately NOT here.
--
-- Security model (IMPORTANT):
--   Row Level Security is ENABLED on both tables with NO policies. With RLS on
--   and no policies, the public/anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) can
--   read and write NOTHING in these tables. All application access happens
--   server-side using the service-role key, which bypasses RLS entirely. This
--   keeps lead data private without any client ever touching it.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (present by default on Supabase, but we
-- ensure it explicitly so this migration is self-contained).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- people — the contact directory. One row per person, unique by email.
-- Custom attributes (how_they_heard, company_size, estimated_budget) live in
-- the `attributes` jsonb column so the schema stays stable as they evolve.
-- ----------------------------------------------------------------------------
create table if not exists public.people (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  name           text,
  phone          text,
  company        text,
  role           text,
  source_site    text,
  ok_to_contact  boolean not null default false,
  attributes     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- contacts — the inquiry pipeline. Each inquiry links to one person and moves
-- through the stages in the status CHECK. New leads always land as 'new_lead'.
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people (id) on delete cascade,
  type        text not null check (
                type in (
                  'ai_development_project',
                  'ai_consulting',
                  'ongoing_support',
                  'general_inquiry'
                )
              ),
  subject     text,
  message     text,
  source      text,
  status      text not null default 'new_lead' check (
                status in (
                  'new_lead',
                  'contacted',
                  'discovery_call',
                  'proposal',
                  'won',
                  'lost'
                )
              ),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Admin list is "newest first"; the person lookup joins on person_id.
create index if not exists contacts_created_at_desc_idx
  on public.contacts (created_at desc);
create index if not exists contacts_person_id_idx
  on public.contacts (person_id);

-- ----------------------------------------------------------------------------
-- Row Level Security: enabled, NO policies. See the security note at the top —
-- anon key gets zero access; the server's service-role key bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.people   enable row level security;
alter table public.contacts enable row level security;

comment on table public.people is
  'Contact directory, deduplicated by email. RLS enabled with no policies: anon key has no access; server uses the service-role key which bypasses RLS.';
comment on table public.contacts is
  'Inquiry pipeline linked to people. RLS enabled with no policies: anon key has no access; server uses the service-role key which bypasses RLS.';
