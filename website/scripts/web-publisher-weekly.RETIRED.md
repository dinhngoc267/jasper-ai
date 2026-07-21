# web-publisher-weekly — RETIRED (2026-07-20 content-pipeline-to-supabase)

This routine no longer exists. **Unregister `web-publisher-weekly` in Claude
Desktop** (remove `~/.claude/scheduled-tasks/web-publisher-weekly/`).

## Why

Publishing used to be a code change: the routine generated a `.jsx` page under
`website/pages/blog/posts/`, optimised a hero image, updated the blog index,
and opened a PR the operator merged to deploy.

After the content-pipeline-to-supabase rearchitecture, the blog renders from
the Supabase `posts` table (see `website/src/lib/blog.ts`). "Publishing" is now
just a status flip on a row:

- The **writer-weekly** routine writes the post to `post_pending_review`.
- The operator opens `/admin/content/{id}`, reviews/edits, and clicks **Approve**
  (→ `approved`), then **Approve** again (→ `published`).
- The blog route is dynamically rendered, so a `published` post appears at
  `/blog` and `/blog/{slug}` immediately — **no `.jsx` generation, no image
  commit, no PR, no deploy.**

There is no separate "build the page" step left to schedule, so this routine is
retired entirely rather than rewritten.

## Hero images

The one thing the old routine also did — hero images — is now the
`designer-weekly` routine's job (still blocked on the Gemini/GCP billing
issue). Once unblocked, it writes `hero_image_url` onto the post's row
(uploaded to Supabase Storage or Vercel Blob) instead of committing an image
file. No change needed here.
