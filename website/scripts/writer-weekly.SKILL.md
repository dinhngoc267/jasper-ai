---
name: writer-weekly
description: Mondays at 9:03 AM — reads the live channel signal, writes ONE complete blog post (title + full body + SEO/tags) in the owner's voice, and saves it to the posts table as 'pending_review' for review in /admin/content. No brief step, no git PR.
suggested_cron: "3 9 * * 1"
---

<!--
REWRITTEN ROUTINE FILE (2026-07-20 content-pipeline-to-supabase, revised to
single-shot full-post generation). This replaces the previously registered
writer-weekly under ~/.claude/scheduled-tasks/writer-weekly/SKILL.md. The
operator must re-register it in Claude Desktop.

WHAT CHANGED: the pipeline no longer has a separate brief-approval step. This
one routine reads the channel signal, writes the COMPLETE post, and lands it in
the Supabase `posts` table as `pending_review`. The operator reviews the
finished post in /admin/content and publishes it (one click, no deploy) or
rejects it. The old `content-brief-weekly` routine is retired (see
E4.3-content-brief-routine.RETIRED.md).
-->

It is Monday 9:03 AM. Use TODAY'S actual calendar date wherever this prompt says YYYY-MM-DD (compute it at run time — do not hardcode).

Project root: `~/code-projects/jasper-ai`. This routine no longer touches git — it writes to the `posts` table.

**This routine WRITES a complete post; it never publishes.** It stops at a `pending_review` row. The operator reviews the finished post in `/admin/content`, edits inline if needed, then clicks **Publish** (→ `published`, live immediately, no deploy) or **Reject**. Human approval is the gate.

## Step 1 — Read the channel signal

```bash
cd ~/code-projects/jasper-ai/website
node scripts/channel-signal.mjs
```

Parse the `<!-- CHANNEL_SIGNAL_JSON: {...} -->` blob on the last line and read `recommendedChannelKey`, `confidence`, and `strategy` ({ format, angle, keywordApproach }). **Trust the confidence verdict:** if `weak`/`tie`, the script has resolved the channel to `Fallback` (evergreen positioning) — don't force a channel angle the data doesn't support.

## Step 2 — Read context

Read:
- `docs/product/product-plan.md` — what Jasper AI sells, ICP, positioning, tagline "AI systems that ship".
- `agents/writer/context/persona.md` — writer persona and style guide (if it exists).
- To avoid repeating a topic, check what's already in the pipeline:
  ```bash
  node scripts/posts-cli.mjs list
  ```

Pick ONE topic biased toward the recommended channel's `strategy` (or evergreen positioning if the signal is weak/tied). Choose a short kebab-case `{slug}`.

## Step 3 — Write the COMPLETE blog post

Write the full article as markdown — no frontmatter, no leading `# H1` (the `title` field is the H1). Apply the Neil Patel self-critique checklist before saving:
- [ ] Headline is specific and benefit-driven (specific, not clever)
- [ ] First paragraph hooks with a problem or surprising statement
- [ ] Each section has a clear takeaway
- [ ] No paragraph exceeds 4 lines
- [ ] At least one concrete example per major point
- [ ] Ends with a clear call to action

Markdown the renderer supports: `## H2`, paragraphs, `**bold**`, `[links](url)`, and `- ` bullet lists.

Write the result to a temp JSON file, e.g. `/tmp/post.json`:

```json
{
  "slug": "kebab-case-topic",
  "title": "The finished post title (becomes the H1)",
  "body_markdown": "the FULL article as markdown, no frontmatter, no leading # H1",
  "description": "1-2 sentence meta description / blog-index teaser",
  "tags": ["2-4 relevant kebab-case tags"],
  "target_keyword": "one primary SEO keyword per strategy.keywordApproach",
  "source_channel": "the recommendedChannelKey from Step 1",
  "source_confidence": "the confidence verdict (strong|weak|tie)"
}
```

## Step 4 — Save the post to the posts table

```bash
cd ~/code-projects/jasper-ai/website
node scripts/posts-cli.mjs create-post /tmp/post.json
```

This inserts a `posts` row with `status = 'pending_review'`, prints its `{ id, slug }`, and emails the operator a review-needed link to `/admin/content/{id}`. No git branch, commit, or PR. If the slug collides with an existing post, pick a more specific slug and re-run.

**Do NOT publish.** Publishing is the operator's one click in `/admin/content`.

## Step 5 — Notify (if Lark configured)

The review-needed email already fires from Step 4. Additionally, if `LARK_WEBHOOK_URL` is set:

```bash
lark-cli im +messages-send --as bot --chat-id "$LARK_CHAT_ID" --text $'✍️ New blog post ready for review in /admin/content. Publish it there (no deploy needed).'
```

If not configured, skip this step silently.
