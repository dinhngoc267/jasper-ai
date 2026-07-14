# EXEC-PLAN — Build 1: People + Contacts

- [x] Install `@supabase/supabase-js` (+ `server-only`) in `website/`
- [x] Write SQL migration `0001_build1_people_contacts.sql` (people + contacts, RLS on, no policies, indexes)
- [x] Server-only Supabase client `src/lib/supabase/server.ts` (service-role, lazy, env-guarded)
- [x] Rewrite `src/app/actions/contact.ts` to upsert person by email + insert linked contact (status new_lead)
- [x] Admin leads page `src/app/admin/page.tsx` (server component, force-dynamic, joined query, empty/error state)
- [x] Verify `.env.example` has Supabase + Resend vars (present; no new vars introduced)
- [x] Typecheck passes (`tsc --noEmit`)
- [x] Lint passes (`eslint`)
- [x] `next build` passes with no DB connection; `/admin` renders as ƒ Dynamic
- [ ] QA round (deferred — session has no live Supabase; run once DB connector is authorized)
- [ ] Run migration in Supabase (operator action)
- [ ] Live end-to-end submit → visible test (operator action, post-migration)
