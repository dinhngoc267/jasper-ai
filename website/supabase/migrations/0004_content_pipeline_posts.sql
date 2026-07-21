-- ============================================================================
-- Migration 0004 — Content pipeline: posts
-- ----------------------------------------------------------------------------
-- Purpose: one row per piece of content, carrying its full lifecycle from
-- brief to published. Replaces `content/topics/{slug}/brief.md` + `blog.md`
-- + the git-PR gate at every pipeline stage with a single table the admin UI
-- and the local routines (channel-signal, writer-weekly, linkedin-repurpose)
-- read/write directly.
--
-- Security model (IMPORTANT):
--   Row Level Security is ENABLED with NO policies — same pattern as 0001's
--   `people`/`contacts`, 0002's `activity_log`, and 0003's `orders`. With RLS
--   on and no policies, the public/anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
--   can read and write NOTHING in this table. All application access happens
--   server-side using the service-role key, which bypasses RLS entirely —
--   this is what keeps unpublished drafts from leaking to the public site.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- posts — one row per piece of content, brief through published.
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  -- Lifecycle: the weekly routine writes a COMPLETE post straight to
  -- `pending_review`; the operator reviews it in /admin/content and either
  -- publishes it (→ published, live immediately, no deploy) or rejects it.
  status             text not null default 'pending_review' check (
                       status in (
                         'pending_review',
                         'published',
                         'rejected'
                       )
                     ),

  -- The document. A content item is a blog post: `title` + `body_markdown`.
  -- `body_markdown` holds the brief (written as a short markdown plan) early
  -- in the lifecycle, then the full article once the writer expands it — the
  -- admin UI renders title + body at every stage. `description` doubles as
  -- the blog index teaser / <meta> description (matches `Post.description`
  -- in `src/lib/blog.ts`).
  title              text,
  body_markdown      text,
  description        text,

  -- Blog settings — secondary metadata, edited in the detail page's settings
  -- section rather than the document body.
  tags               text[],
  target_keyword     text,
  hero_image_url     text,

  -- LinkedIn fields — separate from `status` because the LinkedIn draft
  -- lags behind: a post can be `published` while its LinkedIn draft is
  -- still `pending_review`.
  linkedin_draft     text,
  linkedin_status    text check (
                       linkedin_status is null or linkedin_status in (
                         'pending_review',
                         'approved',
                         'rejected'
                       )
                     ),

  -- Provenance (read-only in the UI): which channel signal proposed this.
  source_channel     text,
  source_confidence  text,

  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Blog rendering filters on status = 'published' and looks up by slug; the
-- admin list view groups/filters by status, newest first.
create index if not exists posts_status_idx
  on public.posts (status);
create index if not exists posts_created_at_desc_idx
  on public.posts (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security: enabled, NO policies. See the security note at the top —
-- anon key gets zero access; the server's service-role key bypasses RLS.
-- ----------------------------------------------------------------------------
alter table public.posts enable row level security;

comment on table public.posts is
  'Content pipeline: one row per post, brief through published. RLS enabled with no policies: anon key has no access (keeps drafts from leaking); server uses the service-role key which bypasses RLS.';

-- ----------------------------------------------------------------------------
-- Keep updated_at current on every write, same convention as other tables
-- in this project that track edits.
-- ----------------------------------------------------------------------------
create or replace function public.set_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_posts_updated_at();

-- ----------------------------------------------------------------------------
-- posts_activity_log — one row per Approve/Reject transition on a posts row.
-- ----------------------------------------------------------------------------
-- A separate table rather than reusing `activity_log` (0002): that table's
-- `contact_id`/`person_id` are NOT NULL foreign keys into `contacts`/`people`
-- and this pipeline has neither — a lightweight table avoids nullable FKs on
-- an otherwise-unrelated audit trail.
create table if not exists public.posts_activity_log (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  from_status  text,
  to_status    text not null,
  actor        text not null default 'admin',
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists posts_activity_log_post_id_idx
  on public.posts_activity_log (post_id);

alter table public.posts_activity_log enable row level security;

comment on table public.posts_activity_log is
  'Append-only audit trail of posts.status changes. RLS enabled with no policies: anon key has no access; server uses the service-role key which bypasses RLS.';
