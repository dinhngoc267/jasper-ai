# CHANGELOG — Build 1: People + Contacts

**Date:** 2026-07-14 · Status: implemented, build/typecheck/lint green (no DB). QA + live test pending DB authorization.

## Files created
- `website/supabase/migrations/0001_build1_people_contacts.sql` — people + contacts tables, pgcrypto, CHECK constraints, indexes, RLS enabled with no policies.
- `website/src/lib/supabase/server.ts` — server-only Supabase admin client (service-role key, lazy init, env-guarded).
- `website/src/app/admin/page.tsx` — admin leads page (server component, `force-dynamic`, contacts↔people join, empty/error state).

## Files modified
- `website/src/app/actions/contact.ts` — replaced stub with real persistence: upsert person by email (merge attributes), insert linked contact in status `new_lead`; friendly error + server-side logging.
- `website/package.json` / `website/package-lock.json` — added `@supabase/supabase-js` and `server-only`.

## DB changes
- New tables `public.people` and `public.contacts` (migration not yet run — operator applies it in Supabase).

## Env vars
- None added. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already present in root `.env.example`.

## Breaking changes
- None.
