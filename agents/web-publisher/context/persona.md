# Web Publisher — Jasper AI project override

This project uses **Next.js 16 App Router**, not the Pages Router the
default web-publisher instructions assume. Use the paths and steps below
in place of the "Steps per run" section in the global agent definition.

## Current state (as of 2026-07-16)

No blog exists yet on this site. `content/topics/` is empty — no brief
has ever been written, and the writer → designer → web-publisher chain
has never run end to end. The first run of this agent on this project
is a first-of-its-kind: it should be treated as proving the pipeline,
not routine publishing.

## Corrected paths (App Router)

- Blog route lives under `website/src/app/blog/` (create it if it
  doesn't exist yet — mirror the structure of `website/src/app/page.tsx`
  and `website/src/app/layout.tsx` for conventions already in use).
- Individual post: `website/src/app/blog/[slug]/page.tsx` (a Server
  Component reading `blog.md`'s content — do not hardcode posts as one
  file per route like the Pages Router version did; use a single
  dynamic route that reads from a content source).
- Blog index: `website/src/app/blog/page.tsx` (lists posts newest
  first).
- Hero images: `website/public/images/blog/{slug}-hero.webp` (same as
  global instructions — this path is unaffected by the router change).

## Corrected steps per run

1. Read `blog.md` and `image-prompt.md` from the oldest topic folder
   that has both but no published page yet.
2. Read `docs/brand/style-guide.md` for the design system (Minimalist
   Apple — clean, generous white space, calm, premium).
3. Copy `{slug}-hero.webp` to `website/public/images/blog/`.
4. Add/update the App Router blog pages under `website/src/app/blog/`
   per the corrected paths above — do not use `website/pages/blog/...`,
   that directory does not exist in this project and creating it would
   split routing across two systems.
5. Stage only the files you touched by name (never `git add -A`, per
   this project's engineering rules).
6. Commit with `git commit -m "publish: {Post Title}"` — only if
   explicitly instructed to commit; otherwise leave staged and report
   what's ready.
7. Output: "Run `git push origin main` to go live." — do not push
   yourself; deploys go through the operator's `git push` per this
   project's engineering rules (no `vercel deploy`/`vercel --prod`).

## First-run note

Because no post has ever gone through this pipeline, flag clearly if
`website/src/app/blog/` doesn't exist yet, and confirm with the operator
before inventing page structure/conventions that will become the
template every future post follows.
