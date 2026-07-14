# TECH-PLAN — Build 1: People + Contacts data layer

**Date:** 2026-07-14 · **Task slug:** build1-people-contacts

## Goal
Turn the existing (stubbed) contact form into real captured leads and give the
operator an `/admin` page to see them — proving the submit → visible loop from
the product plan's Build 1.

## Architecture
- **DB (Supabase Postgres):** two tables — `people` (contact directory, unique
  by email) and `contacts` (inquiry pipeline linked to a person). Custom
  attributes (`how_they_heard`, `company_size`, `estimated_budget`) live in
  `people.attributes` jsonb.
- **Access:** server-only, via the service-role key. RLS is enabled on both
  tables with **no policies**, so the anon key can touch nothing; the
  service-role key bypasses RLS. Secrets never reach the client.
- **Write path:** `submitContact` server action — upsert person by email
  (merging attributes), then insert a `contacts` row in status `new_lead`.
- **Read path:** `/admin` server component, `force-dynamic`, joins contacts →
  people, newest first.

## Schema
See `website/supabase/migrations/0001_build1_people_contacts.sql`.
- `contacts.type` CHECK: the 4 inquiry enums.
- `contacts.status` CHECK: new_lead → contacted → discovery_call → proposal →
  won / lost; default `new_lead`.
- Indexes: `contacts(created_at desc)`, `contacts(person_id)`.
- Scope: People + Contacts ONLY. `activity_log` and `orders` are Build 2.

## Key decisions
- **Lazy client init** (`getSupabaseAdmin`) so importing the module during
  `next build` doesn't require env vars — build stays green with no DB.
- **`export const dynamic = "force-dynamic"`** on `/admin` so build never
  queries the DB; the read happens at request time only.
- **Attribute merge:** fetch existing `attributes` and spread-merge so repeat
  submissions enrich rather than clobber prior values.
- **No auth** on `/admin` — the product brief says open/unprotected until
  explicitly asked.
- **`server-only`** import on the client util to hard-fail if it's ever pulled
  into a client component.

## Constraints honored
No migrations run, no runtime DB connection, no commit/push/deploy. Left in the
working tree on `main` for review.
