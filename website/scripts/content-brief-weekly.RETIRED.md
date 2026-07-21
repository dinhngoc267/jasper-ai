# content-brief-weekly — RETIRED (2026-07-20 content-pipeline-to-supabase)

This routine no longer exists. It was **never registered** in Claude Desktop,
so there is nothing to unregister — just don't register it.

## Why

The pipeline used to have a separate brief-approval step: `content-brief-weekly`
proposed a brief (topic + angle), the operator approved it, then
`writer-weekly` expanded it into the full post. With AI, writing the full draft
is cheap, so the brief gate mostly added an extra approval each week.

The brief step is now folded into **writer-weekly**, which reads the channel
signal and writes a COMPLETE blog post in one shot, landing it in the `posts`
table as `pending_review`. The operator reviews the finished post in
`/admin/content` and publishes or rejects it — one gate instead of two.

See `writer-weekly.SKILL.md` for the merged routine.
