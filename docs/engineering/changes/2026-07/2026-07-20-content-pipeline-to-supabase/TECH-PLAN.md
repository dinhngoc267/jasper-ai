# TECH-PLAN: Content pipeline moves from GitHub PRs to Supabase + /admin

Spec: `docs/plans/2026-07-20-content-leadgen-optimization.md` (Phase 1) plus
the follow-on design conversation that decided this rearchitecture
(2026-07-20, operator-approved).

## Why

Phase 1 shipped the brief-backlog + LinkedIn-repurpose + Vercel Analytics
work using the existing pattern: automation writes files, opens a PR, human
merges. Walking that pipeline end to end surfaced two things:

1. Every approval in this loop (brief, post text, hero image, publish,
   LinkedIn draft) is a content decision, not a code change — there is no
   diff worth reviewing as a PR, only a piece of prose or an asset to
   approve. GitHub PR review earns its keep on code changes; it's the
   wrong tool for "is this the right topic/angle/wording."
2. The blog is already more data-driven than its own docs describe:
   `website/src/app/blog/[slug]/page.tsx` is one generic template that
   calls `getPostBySlug(slug)` from `website/src/lib/blog.ts`, which reads
   `website/src/content/blog/{slug}.md` off disk. There is no per-post
   React component to generate. That means "publish" can become a status
   flip on a database row instead of a git commit + deploy, once the data
   source changes.

This plan moves the whole content pipeline onto the same
Supabase-backed-admin pattern already used for leads/contacts/orders, and
keeps GitHub PRs reserved for actual application code changes.

## Scope

1. New `posts` table carrying the full lifecycle of one piece of content
   from brief to published, replacing `content/topics/{slug}/brief.md` +
   `blog.md` + the git-PR gate at every stage.
2. Swap `website/src/lib/blog.ts`'s two read functions from filesystem to
   Supabase, switch the blog route from static generation to
   dynamic/revalidating rendering. No change to `page.tsx`, `layout.tsx`,
   the markdown renderer, or the blog index — they only depend on the
   `Post` shape, not its source.
3. New `/admin/content` page: list by status, a detail view per post with
   inline edit, Approve/Reject actions.
4. Email notification (reusing existing Resend wiring) on every
   review-needed state, linking to the relevant admin page.
5. Rewire the four local routines (`channel-signal` / brain,
   `writer-weekly`, `designer-weekly`, `linkedin-repurpose-weekly`) to
   read/write `posts` rows instead of git files + PRs. Same schedules.
6. Retire the git-based brief/blog.md flow and the PR-opening instructions
   in each routine's `SKILL.md` / `.SKILL.md` file.

## Explicit non-goals for this change

- No change to how leads/contacts/orders/people work — this only touches
  the content pipeline.
- No change to the final deploy mechanism for actual code changes — the
  engineering rule (`git push` → CI/CD only, never direct push to `main`)
  is untouched; it just no longer applies to publishing a blog post,
  because publishing a post is no longer a code change.
- No LinkedIn API integration — `linkedin_draft` still gets copy-pasted by
  the operator by hand. This plan only moves the *approval* of the draft
  text into the UI.
- No change to `designer-weekly`'s actual image generation — it's still
  blocked on the Gemini/GCP billing issue; this plan only changes where
  the resulting image URL would be written once that's unblocked.
- Not touching `docs/product/dashboard-baselines/` or the
  `dashboard-baseline-weekly` routine (E4.1) — unrelated pipeline.
- No visitor-facing email — unaffected, still blocked on `jasper-ai.com`.

## Files to touch / add

### Schema
- `website/supabase/migrations/0004_content_pipeline_posts.sql` — new
  `posts` table. One row per piece of content, columns added as the
  pipeline stage requires them (nullable until filled):
  - `id uuid primary key default gen_random_uuid()`
  - `slug text unique not null`
  - `status text not null check (status in (` — see full lifecycle below.
  - Brief fields: `title`, `target_keyword`, `audience`, `angle`,
    `hook_idea`, `supporting_points text[]`, `cta`, `tone`,
    `source_channel`, `source_confidence` (mirrors what
    `channel-signal.mjs` already computes).
  - Post fields: `body_markdown`, `description` (used for the `<meta>`
    description / blog index teaser, same field `blog.ts`'s `Post.description`
    already expects).
  - Asset field: `hero_image_url`.
  - LinkedIn fields: `linkedin_draft`, `linkedin_status` (separate from
    the post's own `status` since it lags behind — a post can be
    `published` while its LinkedIn draft is still `pending_review`).
  - `published_at`, `created_at`, `updated_at`.
  - RLS enabled, no policies — same security model as `people`/`orders`/
    `activity_log`: anon key gets zero access, server uses the
    service-role key.
  - Status lifecycle (single column, linear):
    `brief_pending_review` → `brief_approved` → `writing_in_progress` →
    `post_pending_review` → `approved` → `published` (`rejected` is a
    terminal state reachable from any `*_pending_review` stage).
- One-off data migration (script, not a schema migration): insert the
  existing `scoping-custom-ai-projects` post into `posts` with
  `status = 'published'` so the live site doesn't regress when `blog.ts`
  switches data sources.

### Blog rendering swap
- `website/src/lib/blog.ts` — replace the `fs`/`path` implementation of
  `getAllSlugs`, `getPostBySlug`, `getAllPosts` with Supabase queries
  against `posts` filtered to `status = 'published'`. Keep the exported
  `Post`/`PostMeta` shape identical so no caller needs to change.
- `website/src/app/blog/[slug]/page.tsx` — remove `generateStaticParams`
  (or keep it returning `[]` and add `dynamicParams = true`) so posts
  appearing after the last deploy are still reachable; add
  `export const revalidate = 60` (or similar) so the index/post pages
  pick up new approvals without needing a rebuild.
- No changes needed to `website/src/app/blog/page.tsx` (index),
  `src/lib/markdown.tsx`, or `src/components/blog-cta.tsx` — all consume
  `Post` objects, not the file source.

### Admin UI
- `website/src/app/admin/(dashboard)/content/page.tsx` — list view,
  grouped by status, same table conventions as `/admin/orders` (search,
  pagination if the backlog grows).
- `website/src/app/admin/(dashboard)/content/[id]/page.tsx` — detail view:
  renders whichever fields are populated for that stage, editable form,
  Approve / Reject buttons. Each action writes an `activity_log`-style
  row (reuse the existing `activity_log` table with a new `entity_type`
  discriminator, or a lightweight `posts_activity_log` — decide against
  the existing table's schema before implementation, since `activity_log`
  today is keyed to `contacts`).
- Nav: add "Content" to the shared `/admin` nav alongside Leads/People/
  Orders/Newsletter.

### Email notifications
- Reuse the existing Resend client (`website/src/lib/resend.ts` or
  equivalent — confirm exact path during implementation) and React Email
  pattern from the daily digest cron. New template: "A brief/post/LinkedIn
  draft is ready for review" with a direct link to
  `/admin/content/{id}`. Triggered server-side whenever a `posts` row
  transitions into a `*_pending_review` status — either from the
  automation's own write, or via a Supabase trigger/webhook if the
  automations write directly via the service-role key without going
  through the Next.js app (decide the trigger mechanism during
  implementation; simplest is the automation script sending the email
  itself right after the Supabase write, matching how `channel-signal.mjs`
  already runs standalone).

### Routine rewrites (all currently-authored `.SKILL.md` files)
- `website/scripts/E4.3-content-brief-routine.SKILL.md` → channel-signal
  writes a `posts` row (`status = 'brief_pending_review'`) via the
  Supabase service-role key instead of a git file + PR. No more branch/
  commit/PR steps.
- `~/.claude/scheduled-tasks/writer-weekly/SKILL.md` (registered) →
  queries `posts` for the oldest `brief_approved` row, writes
  `body_markdown` back, sets `status = 'post_pending_review'`. No git
  commit.
- `~/.claude/scheduled-tasks/web-publisher-weekly/SKILL.md` (registered) →
  retired entirely. "Publishing" is now the operator clicking Approve on
  an `approved`-stage post in `/admin/content`, which the admin action
  itself sets to `published` — no separate scheduled routine needed for
  this step at all.
- `website/scripts/E-linkedin-repurpose-routine.SKILL.md` → reads the most
  recently `published` post with `linkedin_status` not yet set, writes
  `linkedin_draft`, sets `linkedin_status = 'pending_review'`. No git PR.
- `designer-weekly` (currently blocked on billing) — once unblocked,
  writes `hero_image_url` (uploaded to Supabase Storage or Vercel Blob)
  instead of committing an image file.
- Cadence (Sun brain → Mon writer → Wed LinkedIn, biweekly writer) is
  unchanged by this plan — only the mechanism (Supabase writes vs. git
  PRs) changes. Registering/updating these in Claude Desktop is a
  separate operational step, same limitation as every prior routine.

## Verification plan (hand to QA after implementation)

1. Migrating the existing published post into `posts` does not change
   what's rendered at `/blog/scoping-custom-ai-projects` — byte-for-byte
   same title/description/date/body as today.
2. A new `posts` row with `status = 'published'` appears on `/blog` and at
   its own `/blog/{slug}` URL without a deploy (confirms dynamic
   rendering actually replaced static generation).
3. A `posts` row NOT in `published` status is unreachable at its URL
   (404) and absent from the blog index — no draft-content leak.
4. `/admin/content` requires login, same as every other admin route.
5. Approve/Reject on each stage transitions `status` correctly and writes
   one activity-log-equivalent row; Reject is reachable from every
   `*_pending_review` stage.
6. Editing a field in the admin UI before approving actually persists
   (e.g. edit `body_markdown`, approve, confirm the published page shows
   the edited text, not the original).
7. Email fires exactly once per transition into a `*_pending_review`
   status, with a working link to the correct `/admin/content/{id}`.
8. RLS check: anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) can read/write
   nothing on `posts`, matching the `people`/`orders` pattern.
9. Old git-based path is fully gone: no routine still opens a PR against
   `content/topics/*` or `website/pages/blog/posts/*`.

## Rollout

Same as prior builds: developer implements → self-verifies (build/
typecheck/lint clean) → QA agent runs the verification plan above →
operator reviews the diff → operator decides on commit/push. Routine
`SKILL.md` rewrites get reviewed by the operator directly (they're not
app code, no CI to gate them) before being re-registered in Claude
Desktop.
