-- ============================================================================
-- Migration 0002 — Build 2: activity_log
-- ----------------------------------------------------------------------------
-- Purpose: an append-only audit trail of every status change on a `contacts`
-- row, so the operator can see how a lead moved through the pipeline (and
-- when) without relying on memory. Written by the admin Kanban board's
-- `updateLeadStatus` server action every time a lead is moved to a new
-- pipeline stage.
--
-- Scope note: this is Build 2 only. `orders` is a separate Build 2 item, not
-- part of this migration.
--
-- Security model (IMPORTANT):
--   Row Level Security is ENABLED with NO policies — same pattern as 0001's
--   `people` and `contacts` tables. With RLS on and no policies, the
--   public/anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) can read and write
--   NOTHING in this table. All application access happens server-side using
--   the service-role key, which bypasses RLS entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- activity_log — one row per status change on a contacts row.
-- ----------------------------------------------------------------------------
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts (id) on delete cascade,
  person_id    uuid not null references public.people (id) on delete cascade,
  from_status  text,
  to_status    text not null,
  actor        text not null default 'admin',
  note         text,
  created_at   timestamptz not null default now()
);

-- Board reads "history for this lead" and "recent activity" respectively.
create index if not exists activity_log_contact_id_idx
  on public.activity_log (contact_id);
create index if not exists activity_log_created_at_desc_idx
  on public.activity_log (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security: enabled, NO policies. See the security note at the top —
-- anon key gets zero access; the server's service-role key bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.activity_log enable row level security;

comment on table public.activity_log is
  'Append-only audit trail of contacts.status changes. RLS enabled with no policies: anon key has no access; server uses the service-role key which bypasses RLS.';
