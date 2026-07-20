---
name: linkedin-repurpose-weekly
description: Wednesdays at 9:15 AM (right after web-publisher-weekly) — finds newly published blog posts with no LinkedIn draft yet, writes a LinkedIn repurpose draft (hook + 3 takeaways + link) to content/topics/{slug}/linkedin-draft.md, and opens a PR for human review. Never posts to LinkedIn itself.
suggested_cron: "15 9 * * 3"
---

<!--
UNREGISTERED ROUTINE FILE (Phase 1, content lead-gen loop). This is authored
content for the operator to review and register manually under
~/.claude/scheduled-tasks/linkedin-repurpose-weekly/ — registering scheduled
tasks is out of reach from this authoring session (same limitation hit with
E4.1 dashboard-baseline-weekly and E4.3 content-brief-weekly).

Cadence rationale: cron "15 9 * * 3" = Wednesday 9:15 AM local, 12 minutes
after web-publisher-weekly (9:03 AM same day) — long enough that a freshly
published page/PR exists to read from, short enough that the repurpose draft
rides the same day's momentum instead of going stale.

Why this routine exists: per docs/plans/2026-07-20-content-leadgen-optimization.md,
LinkedIn + Referral are the top real lead channels today, but no automation
feeds LinkedIn — only search (via blog SEO), which is slow. This is the
single highest-leverage gap in the content engine.
-->

It is Wednesday morning. Use TODAY'S actual calendar date wherever this prompt says YYYY-MM-DD (compute it at run time — do not hardcode).

Project root: `~/code-projects/jasper-ai`. Honor `~/.claude/rules/global-engineering.md` at all times: run `git status` before file work, stage files explicitly by name (never `git add .` / `git add -A`), never push to `main` directly, never `--no-verify`, and open a PR for review rather than merging.

**This routine DRAFTS; it never posts.** It stops at an open PR containing a markdown file. Nothing is ever sent to LinkedIn by this routine — the operator copies the approved draft and posts it manually (or via whatever manual/social workflow they choose). Human approval is the gate, same as every other automation in this project.

## Step 1 — Find a published post with no LinkedIn draft yet

```bash
cd ~/code-projects/jasper-ai
```

Look through `content/topics/*/`. Find the most recently published folder — one that has a corresponding `.jsx` page committed under `website/src/app/blog/` (or `website/pages/blog/posts/`, depending on current routing) — that does NOT yet have a `linkedin-draft.md` file.

If more than one qualifies, pick the most recently published one. If none qualify, stop and send a Lark notification (if configured) noting there's nothing new to repurpose; otherwise exit quietly.

## Step 2 — Read the post and site context

Read:
- `content/topics/{slug}/blog.md` — the full published post
- `docs/product/product-plan.md` — voice, ICP, tagline ("AI systems that ship")
- The live post URL pattern (check `website/src/app/blog/[slug]/page.tsx` or equivalent) to construct the correct link

## Step 3 — Write the LinkedIn draft

Write `content/topics/{slug}/linkedin-draft.md` containing ONE ready-to-post LinkedIn post:

```markdown
# LinkedIn Draft — {post title}

{hook — 1-2 lines, a specific claim or question from the post, NOT the headline restated}

{3 takeaways, each 1-2 lines, written as standalone insights a reader could act on — not a table of contents}

{1-2 line CTA/bridge into the link}

{full post URL}

---
_Repurposed from content/topics/{slug}/blog.md by linkedin-repurpose-weekly on YYYY-MM-DD. DRAFT ONLY — review before posting._
```

Style rules:
- First-person, engineer-to-engineer voice — matches the blog's tone, not a press-release tone.
- No hashtag spam — 0-3 relevant hashtags max, only if they add discoverability.
- Total length should fit LinkedIn's typical high-engagement range (roughly 150-300 words) — this is a repurposed takeaway, not the full article pasted in.
- Do not fabricate stats or claims not present in the source blog post.

## Step 4 — Commit on a branch and open a PR (no auto-merge, no auto-post)

```bash
git status
git pull origin main
git checkout -b content/linkedin/YYYY-MM-DD-{slug}
git add content/topics/{slug}/linkedin-draft.md
git commit -m "content(linkedin): draft repurpose for {slug}"
git push origin content/linkedin/YYYY-MM-DD-{slug}
gh pr create \
  --title "content(linkedin): draft repurpose for {slug}" \
  --base main \
  --body "Automated LinkedIn repurpose draft for the '{post title}' post. DRAFT ONLY — nothing is posted to LinkedIn by this routine. Review the hook/takeaways for accuracy and voice, then copy into LinkedIn manually (or your posting workflow of choice) once merged."
git checkout main
git branch -d content/linkedin/YYYY-MM-DD-{slug} 2>/dev/null || true
```

**Do NOT auto-merge and do NOT post to LinkedIn.** The open PR is the deliverable — same convention as `writer-weekly`, `web-publisher-weekly`, `dashboard-baseline-weekly`, and `content-brief-weekly`.

## Step 5 — Notify (if Lark configured)

If `LARK_WEBHOOK_URL` is set:

```bash
lark-cli im +messages-send --as bot --chat-id "$LARK_CHAT_ID" --text $'✍️ LinkedIn repurpose draft ready for review: content/topics/{slug}/linkedin-draft.md — PR opened. Nothing posted yet.'
```

If not configured, skip this step silently — it is not required for the routine to be considered successful.
