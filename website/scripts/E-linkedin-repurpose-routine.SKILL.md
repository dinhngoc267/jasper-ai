---
name: linkedin-repurpose-weekly
description: Wednesdays at 9:15 AM — finds published posts in the posts table with no LinkedIn draft yet, writes a LinkedIn repurpose draft (hook + 3 takeaways + link), and saves it to the post's row with linkedin_status = pending_review for review in /admin/content. Never posts to LinkedIn itself.
suggested_cron: "15 9 * * 3"
---

<!--
UNREGISTERED ROUTINE FILE (Phase 1, content lead-gen loop). This is authored
content for the operator to review and register manually under
~/.claude/scheduled-tasks/linkedin-repurpose-weekly/ — registering scheduled
tasks is out of reach from this authoring session (same limitation hit with
E4.1 dashboard-baseline-weekly and E4.3 content-brief-weekly).

Cadence rationale: cron "15 9 * * 3" = Wednesday 9:15 AM local. Publishing is
now an operator action in /admin/content (no more web-publisher-weekly), so
this run simply repurposes whatever is already published and not yet drafted
for LinkedIn.

WHAT CHANGED (2026-07-20 content-pipeline-to-supabase): this routine used to
read content/topics/{slug}/blog.md and open a PR with a linkedin-draft.md file.
It now reads published rows from the Supabase `posts` table and writes the
draft back onto the same row (linkedin_draft + linkedin_status =
'pending_review'). No git branch, commit, or PR.

Why this routine exists: per docs/plans/2026-07-20-content-leadgen-optimization.md,
LinkedIn + Referral are the top real lead channels today, but no automation
feeds LinkedIn — only search (via blog SEO), which is slow. This is the
single highest-leverage gap in the content engine.
-->

It is Wednesday morning. Use TODAY'S actual calendar date wherever this prompt says YYYY-MM-DD (compute it at run time — do not hardcode).

Project root: `~/code-projects/jasper-ai`. This routine no longer touches git — it reads and writes the `posts` table directly.

**This routine DRAFTS; it never posts.** It stops at a `linkedin_status = 'pending_review'` value on the post's row. Nothing is ever sent to LinkedIn by this routine — the operator reviews the draft in `/admin/content`, then copies the approved text and posts it manually. Human approval is the gate, same as every other automation in this project.

## Step 1 — Find a published post with no LinkedIn draft yet

```bash
cd ~/code-projects/jasper-ai/website
node scripts/posts-cli.mjs list --linkedin-missing
```

This prints (newest first) every `published` post whose `linkedin_status` is still unset. Pick the most recent one (top of the list). Note its `slug`.

If the list is empty, there's nothing new to repurpose — stop and send a Lark notification (if configured) noting that; otherwise exit quietly.

## Step 2 — Read the post and site context

Read the full post body for the slug you picked:

```bash
node scripts/posts-cli.mjs list --status published
```

(That prints metadata; to get the body, query the row — or read it from `/admin/content/{id}`.) Also read:
- `docs/product/product-plan.md` — voice, ICP, tagline ("AI systems that ship")
- The live post URL is `https://<site>/blog/{slug}` — use it for the link at the bottom of the draft.

## Step 3 — Write the LinkedIn draft

Compose ONE ready-to-post LinkedIn post and write it to a temp JSON file, e.g. `/tmp/linkedin.json`:

```json
{
  "slug": "the-slug-from-step-1",
  "linkedin_draft": "hook (1-2 lines, a specific claim/question from the post, NOT the headline restated)\n\n3 takeaways, each 1-2 lines, written as standalone insights a reader could act on\n\n1-2 line CTA/bridge into the link\n\nhttps://<site>/blog/{slug}"
}
```

Style rules:
- First-person, engineer-to-engineer voice — matches the blog's tone, not a press-release tone.
- No hashtag spam — 0–3 relevant hashtags max, only if they add discoverability.
- Total length in LinkedIn's high-engagement range (~150–300 words) — a repurposed takeaway, not the full article pasted in.
- Do not fabricate stats or claims not present in the source post.

## Step 4 — Save the draft to the post's row

```bash
cd ~/code-projects/jasper-ai/website
node scripts/posts-cli.mjs save-linkedin /tmp/linkedin.json
```

This writes `linkedin_draft` onto the post's row, sets `linkedin_status = 'pending_review'`, and emails the operator a review-needed link to `/admin/content/{id}`. No git branch, commit, or PR.

**Do NOT set linkedin_status to approved and do NOT post to LinkedIn.** The pending-review draft is the deliverable — the operator approves and posts by hand.

## Step 5 — Notify (if Lark configured)

The review-needed email already fires from Step 4. Additionally, if `LARK_WEBHOOK_URL` is set:

```bash
lark-cli im +messages-send --as bot --chat-id "$LARK_CHAT_ID" --text $'✍️ LinkedIn repurpose draft ready for review in /admin/content. Nothing posted yet.'
```

If not configured, skip this step silently — it is not required for the routine to be considered successful.
