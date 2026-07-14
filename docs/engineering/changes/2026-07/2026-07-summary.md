# Engineering changes — 2026-07

| Date | Task | Summary | Status |
|---|---|---|---|
| 2026-07-14 | build1-people-contacts | People + Contacts data layer: form persists leads, /admin lists them | 🟡 Built (DB migration + QA pending) |
| 2026-07-14 | admin-leads-kanban | /admin leads table rebuilt as a drag-and-drop Kanban pipeline board with a dropdown fallback; new activity_log table + updateLeadStatus action | 🟡 Built (0002 migration pending, then PR review) |
| 2026-07-14 | admin-leads-kanban (revision) | Rebuilt /admin to match operator-approved prototype: minimal cards + right-side drawer (stage chips + note, no window.prompt), stale-lead flag, repeat-contact "other inquiries"; seeded 8 people / 9 contacts into the live DB | 🟡 Built (0002 migration pending, then PR review) |
