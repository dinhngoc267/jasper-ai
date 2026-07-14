# EXEC-PLAN — Admin leads Kanban board

- [x] Confirm `.env.example` exists at repo root with Supabase vars (it does; no new env vars introduced by this task)
- [x] Write SQL migration `0002_build2_activity_log.sql` (activity_log, RLS on, no policies, indexes, matches 0001 style)
- [x] Extract shared `selectClass` to `src/lib/ui.ts`; update `contact-form.tsx` to import it
- [x] Server Action `updateLeadStatus` in `src/app/actions/leads.ts` (validate status, read old status, update, best-effort activity_log insert)
- [x] Rebuild `src/app/admin/page.tsx` as a server-fetch wrapper around the new board
- [x] New client component `src/app/admin/leads-board.tsx`: 6 fixed columns, cards, drag-and-drop, dropdown fallback, optimistic move + revert, per-column + whole-board empty states
- [x] Typecheck passes (`tsc --noEmit`)
- [x] Lint passes (`eslint`)
- [x] `next build` passes with no DB connection; `/admin` still renders as ƒ Dynamic
- [x] QA round (self + verification via dev server / preview tool)
- [x] Screenshot of finished board
- [ ] Run migration in Supabase (operator action)
- [ ] Live end-to-end move test post-migration (operator action, to confirm activity_log rows land)

## Revision — compact cards + drawer (operator approved the static prototype)

- [ ] Extend `src/lib/leads.ts`: `LeadRow`/`ActivityLogRow`/`PersonInfo` types, `timeAgo`, `isStale`, `lastTouchedMs`, `initials`, `subjectOrFallback`, exported `Status`
- [ ] Update `src/app/admin/page.tsx`: extend `contacts` select (person_id, subject, source, people.id/created_at), add `fetchActivityLog()` with graceful-missing-table handling
- [ ] Rewrite `src/app/admin/leads-board.tsx`: compact cards only, no drag/dropdown, drawer-open state, grouping by person + by contact, move-with-note (optimistic + revert)
- [ ] New `src/app/admin/lead-drawer.tsx`: header, Stage chips + note textarea, Inquiry, Attributes, Activity timeline, Other-inquiries mini-list
- [ ] Extend `src/app/actions/leads.ts`: `updateLeadStatus(contactId, newStatus, note?)`, note stored on activity_log insert
- [ ] Typecheck passes (`tsc --noEmit`)
- [ ] Lint passes (`eslint`)
- [ ] `next build` passes with no DB connection
- [ ] New `website/scripts/seed-demo-leads.mjs`: 8 people, 9 contacts (1 repeat-contact person), all 6 stages represented, staggered timestamps
- [ ] Run the seed script for real against the live Supabase DB
- [ ] Read-back confirms person count, contact count, and the 2-inquiry person
- [ ] Verify via preview tool against the now-seeded live DB: board renders, stale flags correct, drawer opens with full detail, stage-chip + note move works, note gracefully doesn't persist (no activity_log table) without erroring, repeat-contact drawer shows other inquiry
- [ ] Screenshot of board and of an open drawer
